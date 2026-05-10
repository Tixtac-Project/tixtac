// src/lib/server/workers/queue.worker.ts
//
// Self-contained Queue Worker — background daemon that manages the virtual queue.
// All DB access, Redis operations, and Lua scripts live here.
// hooks.server.ts only calls `startQueueWorkerLoop()` to kick things off.

import { config } from '$lib/server/config';
import { db } from '$lib/server/db';
import { eventShows, seatSections } from '$lib/server/db/schema';
import { redis } from '$lib/server/redis';
import { eq, sql } from 'drizzle-orm';

// ── Lua Scripts ──────────────────────────────────────────────────────────────

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

// Promote a waiting user to active only if:
//   (a) the user still belongs to this event (user_current_queue check), AND
//   (b) the active set has not yet reached cap (atomic ZCOUNT check).
// Returning -1 means cap was already full (abort, do not retry for this user).
// Returning  0 means user already left or was not in waiting (harmless, skip).
// Returning  1 means user was successfully promoted.
//
// Both checks happen inside a single Lua execution which Redis runs atomically,
// preventing two concurrent workers from racing past the cap together.
const PROMOTE_USER_IF_WAITING_SCRIPT = `
  local activeKey      = KEYS[1]
  local waitingKey     = KEYS[2]
  local userCurrentKey = KEYS[3]

  local userId    = ARGV[1]
  local eventId   = ARGV[2]
  local expiresAt = tonumber(ARGV[3])
  local activeTtl = tonumber(ARGV[4])
  local cap       = tonumber(ARGV[5])
  local now       = tonumber(ARGV[6])

  -- Atomic cap guard: count only non-expired active members (score > now)
  local activeCount = redis.call('ZCOUNT', activeKey, now, '+inf')
  if activeCount >= cap then
    return -1  -- cap reached; caller should stop promoting for this cycle
  end

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

// ── Worker Core ──────────────────────────────────────────────────────────────

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
    const activeTtl = gracePeriodSeconds + 5;

    // Per-event cap constants (from config / .env)
    const defaultCap = config.queueDefaultEventCap;
    const maxCap = config.queueMaxEventCap;
    const capRatio = config.queueDynamicCapRatio;

    let didWork = false;
    let hasWaitingUsers = false;

    for (const eventId of eventIdsArray) {
      const activeKey = `active_users:${eventId}`;
      const waitingKey = `waiting_queue:${eventId}`;

      // Step A1: Evict expired active users (score ≤ now).
      //          Conditionally removes `user_current_queue` only if it still points
      //          to this event (safe delete via atomic Lua script).
      const expiredUserIds = await redis.zrange(activeKey, 0, now, { byScore: true });

      if (expiredUserIds.length > 0) {
        didWork = true;
        const pipeline = redis.pipeline();
        for (const uId of expiredUserIds) {
          pipeline.eval(SAFE_DEL_IF_VALUE_SCRIPT, [`user_current_queue:${uId}`], [String(eventId)]);
        }
        pipeline.zremrangebyscore(activeKey, 0, now);
        await pipeline.exec();
        console.log(
          `[QueueWorker] 🧹 Evicted ${expiredUserIds.length} expired users from Event ${eventId}`,
        );
      }

      // Step A2 removed: ghost entries in the waiting list are harmless.
      // They will be naturally promoted to active and quickly evicted after the 60s grace period.

      // Step B: Compute per-event dynamic cap from remaining seats, store in Redis.
      //         cap = min(MAX_CAP, ceil(remainingSeats * ratio))
      //
      // NOTE: availableSeats is a denormalized counter on seat_sections.
      // It is kept in sync by the purchase flow (purchase.service.ts).
      // If a bug causes drift, cap will be computed from a stale value.
      // Cross-check with SELECT COUNT(*) FROM seats WHERE status='available'
      // if you suspect the counter is off.
      const capKey = `queue:cap:${eventId}`;
      let eventCap: number;
      try {
        const [seatsRow] = await db
          .select({
            remaining: sql<number>`COALESCE(SUM(${seatSections.availableSeats}), 0)`,
          })
          .from(seatSections)
          .innerJoin(eventShows, eq(eventShows.id, seatSections.showId))
          .where(eq(eventShows.eventId, Number(eventId)));

        const remaining = Number(seatsRow?.remaining ?? 0);
        eventCap =
          remaining > 0 ? Math.max(1, Math.min(maxCap, Math.ceil(remaining * capRatio))) : 0;

        // Adaptive TTL: shorten cache aggressively when seats are scarce.
        // e.g. remaining=5, cap=1, stale cap=10 for 120s → 10 users compete for 5 seats.
        const LOW_SEATS_THRESHOLD = 20;
        const cacheTtl = remaining < LOW_SEATS_THRESHOLD ? 30 : 120;
        await redis.set(capKey, String(eventCap), { ex: cacheTtl });
        console.log(
          `[QueueWorker] 📊 Event ${eventId}: remaining=${remaining}, cap=${eventCap}, cacheTtl=${cacheTtl}s`,
        );
      } catch (capErr) {
        // Non-fatal: fallback to cached cap or default
        const cached = await redis.get(capKey);
        eventCap = cached ? Number(cached) : defaultCap;
        console.warn(
          `[QueueWorker] ⚠️ Cap computation failed for Event ${eventId}, using ${eventCap}`,
        );
      }

      // Step C: Promote waiting users into available slots.
      //
      // Cap enforcement is done INSIDE the Lua script (atomic ZCOUNT >= cap check)
      // so two concurrent workers can never jointly exceed eventCap, even if the
      // distributed lock briefly overlaps (e.g. a slow cycle runs past 120s).
      //
      // ⚠️  Trade-off: cap is based on the last Worker cycle's snapshot of remainingSeats.
      // Between two cycles, multiple checkouts may complete → actual remaining drops but
      // cap stays stale. This is intentional: the queue only throttles DB access, it does
      // NOT enforce seat inventory. Seat locking and oversell prevention happen downstream
      // in purchase.service.ts via SELECT ... FOR UPDATE.
      const nextUserIds = await redis.zrange(waitingKey, 0, eventCap - 1);

      if (nextUserIds.length > 0) {
        const pipeline = redis.pipeline();
        for (const uId of nextUserIds) {
          pipeline.eval(
            PROMOTE_USER_IF_WAITING_SCRIPT,
            [activeKey, waitingKey, `user_current_queue:${uId}`],
            [String(uId), String(eventId), now + slotDurationMs, activeTtl, eventCap, now],
          );
        }
        const results = await pipeline.exec();
        const promotedCount = results.filter((r) => Number(r) === 1).length;
        // r === -1 means cap was full mid-pipeline; harmless, those users stay in waiting.

        if (promotedCount > 0) {
          didWork = true;
          console.log(`[QueueWorker] 🚪 Xả ${promotedCount} users vào Active (Event ${eventId})`);
          // TODO: Notify promoted users via SSE/pub-sub so they don't have to
          // wait for the next polling cycle (~3-5s). Requires a Redis pub-sub
          // channel (e.g. PUBLISH queue:promoted:{userId} '1') and an SSE
          // endpoint that subscribes per-user.
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

      if (waitingCountAfter > 0) hasWaitingUsers = true;

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

// ── Worker Loop ──────────────────────────────────────────────────────────────

const globalForWorker = globalThis as unknown as {
  __queueWorkerStarted: boolean;
  __isWorkerRunning: boolean;
};

export function startQueueWorkerLoop(): void {
  if (!config.enableQueueWorker || globalForWorker.__queueWorkerStarted) return;

  globalForWorker.__queueWorkerStarted = true;
  globalForWorker.__isWorkerRunning = false;

  const loopWorker = async () => {
    if (globalForWorker.__isWorkerRunning) return;
    globalForWorker.__isWorkerRunning = true;

    let delay = 30_000;
    try {
      const result = await runQueueWorker();
      delay = result === 'active' ? 3_000 : result === 'no-lock' ? 10_000 : 30_000;
    } finally {
      globalForWorker.__isWorkerRunning = false;
      const jitter = Math.floor(Math.random() * 1000);
      setTimeout(loopWorker, delay + jitter);
    }
  };

  setTimeout(loopWorker, 3_000);
  console.log('👷 [Gatekeeper Worker] Đã khởi động!');
}
