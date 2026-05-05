import { redis } from '$lib/server/redis';
import { Errors, throwError } from '$lib/server/errors';
import { encryptSeatToken } from '$lib/server/auth/jwt';
import { config } from '$lib/server/config';

const withRedisErrorHandling = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') throw err;
    console.error('[Redis Error]', err);
    throwError(Errors.INTERNAL_ERROR, 'Lỗi kết nối hệ thống hàng chờ, vui lòng thử lại sau');
  }
};

export const queueService = {
  async joinQueue(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const userCurrentKey = `user_current_queue:${userId}`;
      const activeKey = `active_users:${eventId}`;
      const waitingKey = `waiting_queue:${eventId}`;
      const now = Date.now();
      const maxUsers = config.maxConcurrentUsers ?? 200;

      const currentQueuedEvent = await redis.get<number | string>(userCurrentKey);
      if (currentQueuedEvent && Number(currentQueuedEvent) !== eventId) {
        throwError(Errors.EVENT_NOT_AVAILABLE, 'Bạn đang tham gia hàng chờ của một sự kiện khác');
      }

      const existingScore = await redis.zscore(activeKey, userId);
      if (existingScore && existingScore > now) {
        const expiresInSeconds = Math.max(1, Math.ceil((existingScore - now) / 1000));
        const token = await encryptSeatToken({ userId, eventId }, expiresInSeconds);
        return { status: 'active', expiresAt: existingScore, token };
      }

      const expiresAt = now + config.accessTokenDuration * 1000;

      const luaScript = `
        local activeKey = KEYS[1]
        local now = tonumber(ARGV[1])
        local maxUsers = tonumber(ARGV[2])
        local expiresAt = tonumber(ARGV[3])
        local userId = ARGV[4]

        local activeCount = redis.call('ZCOUNT', activeKey, now, '+inf')
        if activeCount < maxUsers then
          redis.call('ZADD', activeKey, expiresAt, userId)
          return 1
        end
        return 0
      `;

      const addedToActive = await redis.eval<[number, number, number, number], number>(
        luaScript,
        [activeKey],
        [now, maxUsers, expiresAt, userId]
      );

      if (addedToActive === 1) {
        await redis.pipeline()
          .zrem(waitingKey, userId)
          .set(userCurrentKey, eventId, { ex: 600 })
          .exec();

        const token = await encryptSeatToken({ userId, eventId }, config.accessTokenDuration);
        return { status: 'active', expiresAt, token };
      } else {
        await redis.zadd(waitingKey, { nx: true }, { score: now, member: userId });
        await redis.set(userCurrentKey, eventId, { ex: 600 });

        const position = await redis.zrank(waitingKey, userId);
        return { status: 'waiting', position: (position ?? 0) + 1 };
      }
    });
  },

  async confirmSlot(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const activeKey = `active_users:${eventId}`;
      const now = Date.now();
      const expiresAt = now + config.accessTokenDuration * 1000;

      // Atomic check & update: Ensures user is strictly active before minting fresh token
      const luaScript = `
        local currentScore = tonumber(redis.call('ZSCORE', KEYS[1], ARGV[1]) or 0)
        if currentScore > tonumber(ARGV[2]) then
          redis.call('ZADD', KEYS[1], 'XX', tonumber(ARGV[3]), ARGV[1])
          return 1
        end
        return 0
      `;

      const updated = await redis.eval<[number, number, number], number>(
        luaScript,
        [activeKey],
        [userId, now, expiresAt]
      );

      if (updated !== 1) {
        throwError(Errors.FORBIDDEN, 'Slot của bạn không tồn tại hoặc đã hết hạn');
      }

      await redis.set(`user_current_queue:${userId}`, eventId, { ex: 600 });

      const token = await encryptSeatToken({ userId, eventId }, config.accessTokenDuration);
      return { expiresAt, token };
    });
  },

  async leaveQueue(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const userCurrentKey = `user_current_queue:${userId}`;
      const currentQueuedEvent = await redis.get<number | string>(userCurrentKey);
      
      // Prevents Cross-queue lock bypass: Only delete if user is actually in THIS event
      if (currentQueuedEvent && Number(currentQueuedEvent) === eventId) {
        await redis.pipeline()
          .del(userCurrentKey)
          .zrem(`active_users:${eventId}`, userId)
          .zrem(`waiting_queue:${eventId}`, userId)
          .exec();
      }
      return { success: true };
    });
  },

  async getQueueStatus(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const activeKey = `active_users:${eventId}`;
      const waitingKey = `waiting_queue:${eventId}`;
      const now = Date.now();

      const activeScore = await redis.zscore(activeKey, userId);
      if (activeScore && activeScore > now) {
        const expiresInSeconds = Math.max(1, Math.ceil((activeScore - now) / 1000));
        const token = await encryptSeatToken({ userId, eventId }, expiresInSeconds);
        return { status: 'active', expiresAt: activeScore, token };
      }

      const position = await redis.zrank(waitingKey, userId);
      if (position !== null) {
        return { status: 'waiting', position: position + 1 };
      }

      return { status: 'none' };
    });
  },
};
