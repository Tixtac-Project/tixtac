import { verifyAuthToken } from '$lib/server/auth/jwt';
import { startWorker } from '$lib/server/mq/consumer';
import { initMQWithRetry } from '$lib/server/mq/initMQ';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { config } from '$lib/server/config';
import { redis } from '$lib/server/redis';

// Fire-and-forget background init — must not block server startup on slow MQ connect.
void (async () => {
  try {
    await initMQWithRetry();
    await startWorker();
  } catch (err) {
    console.error('[MQ] Background init failed:', err);
  }
})();

const RELEASE_LOCK_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;

async function runQueueWorker() {
  const lockToken = crypto.randomUUID();
  let lockHeld = false;
  try {
    // Token-based distributed lock: prevents worker A from deleting worker B's lock
    // if A's TTL expires mid-run. ex: 10 is a failsafe.
    const lockResult = await redis.set('worker_lock:queue', lockToken, { nx: true, ex: 10 });
    if (!lockResult) return;
    lockHeld = true;

    // O(1) lookup via dedicated tracking set instead of O(N) SCAN over all keys.
    const eventIdsArray = await redis.smembers('active_event_ids');

    if (eventIdsArray.length === 0) return;

    console.log(`[QueueWorker] Found eventIds:`, eventIdsArray);

    const now = Date.now();
    const slotDurationMs = config.accessTokenDuration * 1000;

    for (const eventId of eventIdsArray) {
      const activeKey = `active_users:${eventId}`;
      const waitingKey = `waiting_queue:${eventId}`;

      // A. Evict expired users
      const expiredUserIds = await redis.zrange(activeKey, 0, now, { byScore: true });

      if (expiredUserIds.length > 0) {
        const pipeline = redis.pipeline();
        for (const uId of expiredUserIds) {
          pipeline.del(`user_current_queue:${uId}`);
        }
        pipeline.zremrangebyscore(activeKey, 0, now);
        await pipeline.exec();
        console.log(`[QueueWorker] 🧹 Đuổi ${expiredUserIds.length} users khỏi Event ${eventId}`);
      }

      const maxUsers = config.maxConcurrentUsers ?? 200;

      // B. Promote waiting users into available slots
      const currentActiveCount = await redis.zcount(activeKey, now, '+inf');
      const availableSlots = Math.max(0, maxUsers - currentActiveCount);

      if (availableSlots > 0) {
        const nextUserIds = await redis.zrange(waitingKey, 0, availableSlots - 1);

        if (nextUserIds.length > 0) {
          const pipeline = redis.pipeline();
          for (const uId of nextUserIds) {
            pipeline.zadd(activeKey, { score: now + slotDurationMs, member: uId });
            pipeline.zrem(waitingKey, uId);
            pipeline.set(`user_current_queue:${uId}`, eventId, {
              ex: config.accessTokenDuration + 5,
            });
          }
          await pipeline.exec();
          console.log(
            `[QueueWorker] 🚪 Xả ${nextUserIds.length} users vào Active (Event ${eventId})`,
          );
        }
      }

      // C. Garbage-collect event from tracking set when both queues are empty
      if (maxUsers > 0 && availableSlots === maxUsers) {
        // All slots free — check if anyone is waiting
        const waitingCount = await redis.zcard(waitingKey);
        if (waitingCount === 0) {
          await redis.srem('active_event_ids', eventId);
          console.log(`[QueueWorker] 🗑️ Removed idle event ${eventId} from tracking set`);
        }
      }
    }
  } catch (error) {
    console.error('[QueueWorker] Error:', error);
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

if (!globalForWorker.__queueWorkerStarted) {
  globalForWorker.__queueWorkerStarted = true;
  globalForWorker.__isWorkerRunning = false;

  const loopWorker = async () => {
    if (globalForWorker.__isWorkerRunning) return;
    globalForWorker.__isWorkerRunning = true;
    try {
      await runQueueWorker();
    } finally {
      globalForWorker.__isWorkerRunning = false;
      setTimeout(loopWorker, 3000);
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
