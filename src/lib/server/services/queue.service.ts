import { encryptSeatToken } from '$lib/server/auth/jwt';
import { config } from '$lib/server/config';
import { Errors, throwError } from '$lib/server/errors';
import { redis } from '$lib/server/redis';

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
      const expiresAt = now + config.accessTokenDuration * 1000;
      const activeTtl = config.accessTokenDuration + 5;
      const waitingTtl = 3600;

      // ── Atomic Lua script: cross-queue guard, already‑active check,
      //     already‑waiting check, promote-or-queue — all in one round‑trip ──
      const joinQueueScript = `
        local activeKey = KEYS[1]
        local waitingKey = KEYS[2]
        local userCurrentKey = KEYS[3]
        local activeEventIdsKey = KEYS[4]

        local now = tonumber(ARGV[1])
        local maxUsers = tonumber(ARGV[2])
        local expiresAt = tonumber(ARGV[3])
        local userId = ARGV[4]
        local eventId = ARGV[5]
        local activeTtl = tonumber(ARGV[6])
        local waitingTtl = tonumber(ARGV[7])

        -- 0. Cross-queue guard
        local currentEvent = redis.call('GET', userCurrentKey)
        if currentEvent and currentEvent ~= eventId then
          return {-1, 0}
        end

        -- 1. Already active?
        local activeScoreRaw = redis.call('ZSCORE', activeKey, userId)
        local activeScore = activeScoreRaw and tonumber(activeScoreRaw) or 0
        if activeScore > now then
          return {2, activeScore}
        end

        -- 2. Already waiting?  Avoid redundant SET — just return position
        local waitingRank = redis.call('ZRANK', waitingKey, userId)
        if waitingRank then
          return {3, waitingRank + 1}
        end

        -- 3. Available slot → promote immediately
        local activeCount = redis.call('ZCOUNT', activeKey, now, '+inf')
        if activeCount < maxUsers then
          redis.call('ZREM', waitingKey, userId)
          redis.call('ZADD', activeKey, expiresAt, userId)
          redis.call('SET', userCurrentKey, eventId, 'EX', activeTtl)
          redis.call('SADD', activeEventIdsKey, eventId)
          return {1, expiresAt}
        end

        -- 4. Full → enqueue as waiting
        redis.call('ZADD', waitingKey, 'NX', now, userId)
        redis.call('SET', userCurrentKey, eventId, 'EX', waitingTtl)
        redis.call('SADD', activeEventIdsKey, eventId)
        local newRank = redis.call('ZRANK', waitingKey, userId)
        return {0, newRank + 1}
      `;

      const [code, value] = await redis.eval<
        [number, number, number, string, string, number, number],
        [number, number]
      >(
        joinQueueScript,
        [activeKey, waitingKey, userCurrentKey, 'active_event_ids'],
        [now, maxUsers, expiresAt, String(userId), String(eventId), activeTtl, waitingTtl],
      );

      // ── Dispatch based on return code ──
      if (code === -1) {
        throwError(Errors.EVENT_NOT_AVAILABLE, 'Bạn đang tham gia hàng chờ của một sự kiện khác');
      }

      // Already active
      if (code === 2) {
        const activeExpiresAt = value;
        const expiresInSeconds = Math.max(1, Math.ceil((activeExpiresAt - now) / 1000));
        const token = await encryptSeatToken({ userId, eventId }, expiresInSeconds);
        return { status: 'active', expiresAt: activeExpiresAt, token };
      }

      // Already waiting — no SET, just return position
      if (code === 3) {
        return { status: 'waiting', position: value };
      }

      // Newly promoted to active
      if (code === 1) {
        const token = await encryptSeatToken({ userId, eventId }, config.accessTokenDuration);
        return { status: 'active', expiresAt: value, token };
      }

      // Newly enqueued as waiting
      return { status: 'waiting', position: value };
    });
  },

  async confirmSlot(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const activeKey = `active_users:${eventId}`;
      const now = Date.now();

      // Atomic check: Ensures user is strictly active before minting fresh token.
      // Does NOT extend the slot — only mints a token for the remaining time.
      // Sets user_current_queue TTL to (remaining_active_time + 5s grace) so it
      // never outlives the ZSET score by more than the grace window.
      const luaScript = `
        local raw = redis.call('ZSCORE', KEYS[1], ARGV[1])
        local currentScore = raw and tonumber(raw) or 0
        local now = tonumber(ARGV[2])
        local eventId = ARGV[3]
        local grace = tonumber(ARGV[4])

        if currentScore > now then
          local ttl = math.max(1, math.ceil((currentScore - now) / 1000) + grace)
          redis.call('SET', KEYS[2], eventId, 'EX', ttl)
          return currentScore
        end

        return 0
      `;

      const activeExpiresAt = await redis.eval<[string, number, string, number], number>(
        luaScript,
        [activeKey, `user_current_queue:${userId}`],
        [String(userId), now, String(eventId), 5],
      );

      if (!activeExpiresAt) {
        throwError(Errors.FORBIDDEN, 'Slot của bạn không tồn tại hoặc đã hết hạn');
      }

      const expiresInSeconds = Math.max(1, Math.ceil((activeExpiresAt - now) / 1000));
      const token = await encryptSeatToken({ userId, eventId }, expiresInSeconds);

      return { expiresAt: activeExpiresAt, token };
    });
  },

  async leaveQueue(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const userCurrentKey = `user_current_queue:${userId}`;

      // Atomic: only remove if user_current_queue still points to this event
      // at the moment of deletion. Prevents cross-queue race conditions.
      const leaveQueueScript = `
        if redis.call('GET', KEYS[1]) == ARGV[1] then
          redis.call('DEL', KEYS[1])
          redis.call('ZREM', KEYS[2], ARGV[2])
          redis.call('ZREM', KEYS[3], ARGV[2])
          return 1
        end
        return 0
      `;

      await redis.eval<[string, string], number>(
        leaveQueueScript,
        [userCurrentKey, `active_users:${eventId}`, `waiting_queue:${eventId}`],
        [String(eventId), String(userId)],
      );

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
        // Only mint a fresh token when ≤ 30s remain — client keeps previous token otherwise
        const token =
          expiresInSeconds <= 30
            ? await encryptSeatToken({ userId, eventId }, expiresInSeconds)
            : null;
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
