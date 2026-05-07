import { verifyAuthToken } from '$lib/server/auth/jwt';
import { startWorker } from '$lib/server/mq/consumer';
import { initMQWithRetry } from '$lib/server/mq/initMQ';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { config } from '$lib/server/config';
import { redis } from '$lib/server/redis';

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

const RELEASE_LOCK_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;

// Only delete user_current_queue if it still points to this event.
// Prevents old event cleanup from deleting a newer event mapping.
const DELETE_USER_QUEUE_IF_EVENT_SCRIPT = `
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
    // Token-based distributed lock with 60s TTL.
    // Note: if a processing cycle exceeds 60s, another worker may acquire the lock.
    // Add lock renewal if cycles can exceed the TTL.
    const lockResult = await redis.set('worker_lock:queue', lockToken, { nx: true, ex: 60 });
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
    const maxUsers = config.maxConcurrentUsers ?? 200;
    const waitingTtlMs = 3600 * 1000;
    const activeTtl = gracePeriodSeconds + 5;

    let didWork = false;
    let hasWaitingUsers = false;

    for (const eventId of eventIdsArray) {
      const activeKey = `active_users:${eventId}`;
      const waitingKey = `waiting_queue:${eventId}`;

      // Step A1: Evict expired active users — conditionally removes `user_current_queue`
      //          only if it still points to this event (safe delete).
      const expiredUserIds = await redis.zrange(activeKey, 0, now, { byScore: true });

      if (expiredUserIds.length > 0) {
        didWork = true;
        const pipeline = redis.pipeline();
        for (const uId of expiredUserIds) {
          pipeline.eval(
            DELETE_USER_QUEUE_IF_EVENT_SCRIPT,
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
            DELETE_USER_QUEUE_IF_EVENT_SCRIPT,
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

      // Step B: Promote waiting users into available slots — atomically checks
      //         `user_current_queue` to ensure the user hasn’t left in the meantime.
      const currentActiveCount = await redis.zcount(activeKey, now, '+inf');
      const availableSlots = Math.max(0, maxUsers - currentActiveCount);

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
          }
        }
      }

      // Step C: Recompute counts after eviction and promotion to decide on GC.
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
      await redis.eval(RELEASE_LOCK_SCRIPT, ['worker_lock:queue'], [lockToken]).catch(() => {});
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
