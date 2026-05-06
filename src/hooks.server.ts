import { verifyAuthToken } from '$lib/server/auth/jwt';
import { startWorker } from '$lib/server/mq/consumer';
import { initMQWithRetry } from '$lib/server/mq/initMQ';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { redis } from '$lib/server/redis';
import { config } from '$lib/server/config';

const mqInitPromise = initMQWithRetry();
await mqInitPromise;
await startWorker();

async function runQueueWorker() {
  try {
    // Phân tán (Distributed lock) để tránh race condition khi chạy nhiều instance
    const lockAcquired = await redis.set('worker_lock:queue', '1', { nx: true, ex: 10 });
    if (!lockAcquired) return;

    let cursor = '0';
    const eventIds = new Set<string>();

    // Tìm tất cả các sự kiện đang có active
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'active_users:*', count: 100 });
      cursor = nextCursor;
      keys.forEach((k) => eventIds.add(k.split(':')[1]));
    } while (cursor !== '0');

    // Tìm tất cả các sự kiện đang có waiting
    cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'waiting_queue:*', count: 100 });
      cursor = nextCursor;
      keys.forEach((k) => eventIds.add(k.split(':')[1]));
    } while (cursor !== '0');

    console.log(`[QueueWorker] Found eventIds:`, Array.from(eventIds));

    if (eventIds.size === 0) return;

    const now = Date.now();

    for (const eventId of eventIds) {
      const activeKey = `active_users:${eventId}`;
      const waitingKey = `waiting_queue:${eventId}`;

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

      const currentActiveCount = await redis.zcount(activeKey, now, '+inf');
      const availableSlots = (config.maxConcurrentUsers ?? 200) - currentActiveCount;

      if (availableSlots > 0) {
        const nextUserIds = await redis.zrange(waitingKey, 0, availableSlots - 1);

        if (nextUserIds.length > 0) {
          const pipeline = redis.pipeline();
          for (const uId of nextUserIds) {
            pipeline.zadd(activeKey, { score: now + 60000, member: uId });
            pipeline.zrem(waitingKey, uId);
            pipeline.set(`user_current_queue:${uId}`, eventId, { ex: 600 });
          }
          await pipeline.exec();
          console.log(
            `[QueueWorker] 🚪 Xả ${nextUserIds.length} users vào Active (Event ${eventId})`,
          );
        }
      }
    }
  } catch (error) {
    console.error('[QueueWorker] Error:', error);
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

    event.locals.user = {
      id: typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : Number(payload.sub),
      role: role as 'admin' | 'customer',
    };
  } catch (e) {
    console.warn('[auth] Token validation failed:', e instanceof Error ? e.message : e);
    event.cookies.delete('auth_token', { path: '/' });
    event.locals.user = null;
  }

  return resolve(event);
};

export const handle = sequence(securityHeaders, auth);
