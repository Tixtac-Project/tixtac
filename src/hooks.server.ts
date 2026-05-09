import { verifyAuthToken } from '$lib/server/auth/jwt';
import { startWorker } from '$lib/server/mq/consumer';
import { initMQWithRetry } from '$lib/server/mq/initMQ';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { config } from '$lib/server/config';
import { db } from '$lib/server/db';
import { eventShows, seatSections } from '$lib/server/db/schema';
import { redis } from '$lib/server/redis';
import { eq, sql } from 'drizzle-orm';

// Fire-and-forget background init — must not block server startup on slow MQ connect.
// Controlled via ENABLE_BACKGROUND_WORKERS env var (default: true).
if (config.enableBackgroundWorkers) {
  void (async () => {
    try {
      await initMQWithRetry();
      await startWorker();
    } catch (err) {
      console.error('[MQ] Background init failed:', err);
    }
  })();
}

// Generic atomic conditional-delete script.
// Deletes KEYS[1] only if its current value equals ARGV[1].
// Used for both worker lock release and user_current_queue cleanup.
const SAFE_DEL_IF_VALUE_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;

// Promote a waiting user to active only if they still belong to this event.
// If the user already left (user_current_queue points elsewhere), just remove from waiting.
const PROMOTE_USER_IF_WAITING_SCRIPT = `
  local activeKey = KEYS[1]
  local waitingKey = KEYS[2]
  local userCurrentKey = KEYS[3]

  local userId = ARGV[1]
  local eventId = ARGV[2]
  local expiresAt = tonumber(ARGV[3])
  local activeTtl = tonumber(ARGV[4])

  if redis.call('GET', userCurrentKey) ~= eventId then
    redis.call('ZREM', waitingKey, userId)
    return 0
  end

  local removed = redis.call('ZREM', waitingKey, userId)
  if removed == 1 then
    redis.call('ZADD', activeKey, expiresAt, userId)
    redis.call('SET', userCurrentKey, eventId, 'EX', activeTtl)
    return 1
  end

  return 0
`;

type WorkerResult = 'no-lock' | 'idle' | 'active';

async function runQueueWorker(): Promise<WorkerResult> {
  const lockToken = crypto.randomUUID();
  let lockHeld = false;
  try {
    // Token-based distributed lock with 120s TTL.
    // WARNING: if a processing cycle across many events + slow DB queries exceeds
    // 120s, two workers may run concurrently. Add lock renewal if that's possible.
    const lockResult = await redis.set('worker_lock:queue', lockToken, { nx: true, ex: 120 });
    if (!lockResult) return 'no-lock';
    lockHeld = true;

    // O(1) lookup via dedicated tracking set instead of O(N) SCAN over all keys.
    const eventIdsArray = await redis.smembers('active_event_ids');

    if (eventIdsArray.length === 0) return 'idle';

    console.log(`[QueueWorker] Found eventIds:`, eventIdsArray);

    const now = Date.now();
    // Workers promote from the waiting list with only the grace period (60s) so
    // users must explicitly confirm before receiving the full holding duration.
    const gracePeriodSeconds = 60;
    const slotDurationMs = gracePeriodSeconds * 1000;
    const waitingTtlMs = 3600 * 1000;
    const activeTtl = gracePeriodSeconds + 5;

    // Per-event cap constants
    const defaultCap = config.queueDefaultEventCap;
    const maxCap = config.queueMaxEventCap;
    const capRatio = config.queueDynamicCapRatio;

    let didWork = false;
    let hasWaitingUsers = false;

    for (const eventId of eventIdsArray) {
      const activeKey = `active_users:${eventId}`;
      const waitingKey = `waiting_queue:${eventId}`;

      // Step A1: Evict expired active users (score ≤ now) — uses explicit score range
      //          instead of byScore option for broad Redis version compatibility.
      //          Conditionally removes `user_current_queue` only if it still points
      //          to this event (safe delete via atomic Lua script).
      const expiredUserIds = await redis.zrange(activeKey, 0, now, { byScore: true });

      if (expiredUserIds.length > 0) {
        didWork = true;
        const pipeline = redis.pipeline();
        for (const uId of expiredUserIds) {
          pipeline.eval(
            SAFE_DEL_IF_VALUE_SCRIPT,
            [`user_current_queue:${uId}`],
            [String(eventId)],
          );
        }
        pipeline.zremrangebyscore(activeKey, 0, now);
        await pipeline.exec();
        console.log(
          `[QueueWorker] 🧹 Evicted ${expiredUserIds.length} expired users from Event ${eventId}`,
        );
      }

      // Step A2: Evict stale waiting users whose 1-hour tracking TTL has elapsed.
      //          Prevents ghost entries in the waiting sorted set.
      const staleBefore = now - waitingTtlMs;
      const staleWaitingUserIds = await redis.zrange(waitingKey, 0, staleBefore, {
        byScore: true,
      });

      if (staleWaitingUserIds.length > 0) {
        didWork = true;
        const pipeline = redis.pipeline();
        for (const uId of staleWaitingUserIds) {
          pipeline.eval(
            SAFE_DEL_IF_VALUE_SCRIPT,
            [`user_current_queue:${uId}`],
            [String(eventId)],
          );
        }
        pipeline.zremrangebyscore(waitingKey, 0, staleBefore);
        await pipeline.exec();
        console.log(
          `[QueueWorker] 🧹 Removed ${staleWaitingUserIds.length} stale waiting users from Event ${eventId}`,
        );
      }

      // Step B: Compute per-event dynamic cap from remaining seats, store in Redis.
      //         cap = min(MAX_CAP, ceil(remainingSeats * ratio)) || DEFAULT_CAP
      const capKey = `queue:cap:${eventId}`;
      let eventCap = defaultCap;
      try {
        // NOTE: availableSeats is a denormalized counter on seat_sections.
        // It is kept in sync by the purchase flow (purchase.service.ts).
        // If a bug causes drift, cap will be computed from a stale value.
        // Cross-check with SELECT COUNT(*) FROM seats WHERE status='available'
        // if you suspect the counter is off.
        const [seatsRow] = await db
          .select({
            remaining: sql<number>`COALESCE(SUM(${seatSections.availableSeats}), 0)`,
          })
          .from(seatSections)
          .innerJoin(eventShows, eq(eventShows.id, seatSections.showId))
          .where(eq(eventShows.eventId, Number(eventId)));

        const remaining = Number(seatsRow?.remaining ?? 0);
        eventCap = remaining > 0
          ? Math.max(1, Math.min(maxCap, Math.ceil(remaining * capRatio)))
          : defaultCap;

        // Adaptive TTL: shorten cache aggressively when seats are scarce to
        // prevent a stale cap from allowing more users than safe.
        // Trade-off: more frequent DB reads near sold-out, but avoids oversell.
        // e.g. remaining=5, cap=1, stale cap=10 for 120s → 10 users compete for 5 seats.
        const LOW_SEATS_THRESHOLD = 20; // below this, refresh cap every 30s
        const cacheTtl = remaining < LOW_SEATS_THRESHOLD ? 30 : 120;
        await redis.set(capKey, String(eventCap), { ex: cacheTtl });
        console.log(
          `[QueueWorker] 📊 Event ${eventId}: remaining=${remaining}, cap=${eventCap}, cacheTtl=${cacheTtl}s`,
        );
      } catch (capErr) {
        // Non-fatal: fallback to cached cap or default
        const cached = await redis.get(capKey);
        eventCap = cached ? Number(cached) : defaultCap;
        console.warn(`[QueueWorker] ⚠️ Cap computation failed for Event ${eventId}, using ${eventCap}`);
      }

      // Step C: Promote waiting users into available slots — atomically checks
      //         `user_current_queue` to ensure the user hasn't left in the meantime.
      //
      // ⚠️  Trade-off: cap is based on the last Worker cycle's snapshot of remainingSeats.
      // Between two cycles, multiple checkouts may complete → actual remaining drops but
      // cap stays stale. This is intentional: the queue only throttles DB access, it does
      // NOT enforce seat inventory. Seat locking and oversell prevention happen downstream
      // in purchase.service.ts via SELECT ... FOR UPDATE.
      const currentActiveCount = await redis.zcount(activeKey, now, '+inf');
      const availableSlots = Math.max(0, eventCap - currentActiveCount);

      if (availableSlots > 0) {
        const nextUserIds = await redis.zrange(waitingKey, 0, availableSlots - 1);

        if (nextUserIds.length > 0) {
          const pipeline = redis.pipeline();
          for (const uId of nextUserIds) {
            pipeline.eval(
              PROMOTE_USER_IF_WAITING_SCRIPT,
              [activeKey, waitingKey, `user_current_queue:${uId}`],
              [String(uId), String(eventId), now + slotDurationMs, activeTtl],
            );
          }
          const results = await pipeline.exec();
          const promotedCount = results.filter((r) => Number(r) === 1).length;

          if (promotedCount > 0) {
            didWork = true;
            console.log(`[QueueWorker] 🚪 Xả ${promotedCount} users vào Active (Event ${eventId})`);
            // TODO: Notify promoted users via SSE/pub-sub so they don't have to
            // wait for the next polling cycle (~3-5s). Requires a Redis pub-sub
            // channel (e.g. PUBLISH queue:promoted:{userId} '1') and an SSE
            // endpoint that subscribes per-user.
          }
        }
      }

      // Step D: Recompute counts after eviction and promotion to decide on GC.
      const [activeCountAfterRaw, waitingCountAfterRaw] = await redis
        .pipeline()
        .zcount(activeKey, now, '+inf')
        .zcard(waitingKey)
        .exec();

      const activeCountAfter = Number(activeCountAfterRaw);
      const waitingCountAfter = Number(waitingCountAfterRaw);

      if (waitingCountAfter > 0) {
        hasWaitingUsers = true;
      }

      if (activeCountAfter === 0 && waitingCountAfter === 0) {
        didWork = true;
        await redis.srem('active_event_ids', eventId);
        console.log(`[QueueWorker] 🗑️ Removed idle event ${eventId} from tracking set`);
      }
    }

    return didWork || hasWaitingUsers ? 'active' : 'idle';
  } catch (error) {
    console.error('[QueueWorker] Error:', error);
    return 'idle';
  } finally {
    // Safe release: only delete if the lock still holds our token.
    if (lockHeld) {
      await redis.eval(SAFE_DEL_IF_VALUE_SCRIPT, ['worker_lock:queue'], [lockToken]).catch(() => {});
    }
  }
}

const globalForWorker = globalThis as unknown as {
  __queueWorkerStarted: boolean;
  __isWorkerRunning: boolean;
};

if (config.enableQueueWorker && !globalForWorker.__queueWorkerStarted) {
  globalForWorker.__queueWorkerStarted = true;
  globalForWorker.__isWorkerRunning = false;

  const loopWorker = async () => {
    if (globalForWorker.__isWorkerRunning) return;
    globalForWorker.__isWorkerRunning = true;

    let delay = 30000;

    try {
      const result = await runQueueWorker();

      delay = result === 'active' ? 3000 : result === 'no-lock' ? 10000 : 30000;
    } finally {
      globalForWorker.__isWorkerRunning = false;
      const jitter = Math.floor(Math.random() * 1000);
      setTimeout(loopWorker, delay + jitter);
    }
  };

  setTimeout(loopWorker, 3000);
  console.log('👷 [Gatekeeper Worker] Đã khởi động!');
}

const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  return response;
};

const auth: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('auth_token');

  if (!token) {
    event.locals.user = null;
    return resolve(event);
  }

  try {
    const raw = await verifyAuthToken(token);

    if (
      !raw ||
      typeof raw !== 'object' ||
      typeof (raw as Record<string, unknown>).role !== 'string'
    ) {
      throw new Error('Malformed token payload');
    }

    const payload = raw as { sub: string | number; role: string };
    const role = payload.role;

    if (role !== 'admin' && role !== 'customer') {
      throw new Error('Invalid role in token');
    }

    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid sub in token');
    }
    event.locals.user = { id, role: role as 'admin' | 'customer' };
  } catch (e) {
    console.warn('[auth] Token validation failed:', e instanceof Error ? e.message : e);
    event.cookies.delete('auth_token', { path: '/' });
    event.locals.user = null;
  }

  return resolve(event);
};

export const handle = sequence(securityHeaders, auth);
