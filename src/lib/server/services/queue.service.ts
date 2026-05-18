import { encryptSeatToken } from '$lib/server/auth/jwt';
import { config } from '$lib/server/config';
import { AppError, Errors, throwError } from '$lib/server/errors';
import { redis } from '$lib/server/redis';

const withRedisErrorHandling = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) throw err;
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
      const capKey = `queue:cap:${eventId}`;
      const now = Date.now();
      const defaultCap = config.queueDefaultEventCap;
      // Users promoted immediately (no waiting) receive a short grace period (60s).
      // They must explicitly call /confirm to receive the full holding duration.
      const initialDuration = 60;
      const expiresAt = now + initialDuration * 1000;
      const activeTtl = initialDuration + 5;
      const waitingTtl = 3600;

      // ── Atomic Lua script: cross-queue guard, already‑active check,
      //     already‑waiting check, promote-or-queue — all in one round‑trip.
      //     Reads per-event cap from Redis (queue:cap:{eventId}); falls back
      //     to DEFAULT_CAP (clamped by MAX_CAP) when the Worker hasn't
      //     computed it yet.
      const joinQueueScript = `
        local activeKey = KEYS[1]
        local waitingKey = KEYS[2]
        local userCurrentKey = KEYS[3]
        local activeEventIdsKey = KEYS[4]
        local capKey = KEYS[5]

        local now = tonumber(ARGV[1])
        local defaultCap = tonumber(ARGV[2])
        local expiresAt = tonumber(ARGV[3])
        local userId = ARGV[4]
        local eventId = ARGV[5]
        local activeTtl = tonumber(ARGV[6])
        local waitingTtl = tonumber(ARGV[7])
        local waitingCapRatio = tonumber(ARGV[8])
        local maxCap = tonumber(ARGV[9])

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

        -- 3. Read per-event cap, ALWAYS clamp to maxCap.
        --    Even if the Worker stored a value, a stale cap from before a
        --    config change could exceed the current QUEUE_MAX_EVENT_CAP.
        --    Fall back to defaultCap (also clamped) if not set yet.
        local capRaw = redis.call('GET', capKey)
        local cap
        if capRaw then
          cap = math.min(tonumber(capRaw), maxCap)
        else
          cap = math.min(defaultCap, maxCap)
        end

        -- If the event is explicitly sold out (cap 0), prevent joining
        if cap <= 0 then
          return {-2, 0}
        end

        -- 4. Available slot → promote immediately ONLY if waiting queue is empty.
        --    Otherwise, user must join the end of the line to preserve FIFO.
        local activeCount = redis.call('ZCOUNT', activeKey, now, '+inf')
        local waitingCount = redis.call('ZCARD', waitingKey)
        if activeCount < cap and waitingCount == 0 then
          redis.call('ZREM', waitingKey, userId)
          redis.call('ZADD', activeKey, expiresAt, userId)
          redis.call('SET', userCurrentKey, eventId, 'EX', activeTtl)
          redis.call('SADD', activeEventIdsKey, eventId)
          return {1, expiresAt}
        end

        -- 5. Full → check waiting limit before enqueueing
        if waitingCount >= math.ceil(cap * waitingCapRatio) then
          return {-3, 0}
        end

        redis.call('ZADD', waitingKey, 'NX', now, userId)
        redis.call('SET', userCurrentKey, eventId, 'EX', waitingTtl)
        redis.call('SADD', activeEventIdsKey, eventId)
        local newRank = redis.call('ZRANK', waitingKey, userId)
        return {0, newRank + 1}
      `;

      const [code, value] = (await redis.eval(
        joinQueueScript,
        [activeKey, waitingKey, userCurrentKey, 'active_event_ids', capKey],
        [
          now,
          defaultCap,
          expiresAt,
          String(userId),
          String(eventId),
          activeTtl,
          waitingTtl,
          config.queueWaitingCapRatio,
          config.queueMaxEventCap,
        ],
      )) as [number, number];

      // ── Dispatch based on return code ──
      // code -1: User is already in another event's queue (cross-queue guard)
      if (code === -1) {
        throwError(Errors.QUEUE_ALREADY_JOINED);
      }

      // code -2: Event is explicitly sold out (cap <= 0)
      if (code === -2) {
        throwError(Errors.BAD_REQUEST, 'Sự kiện hiện đã hết vé', { code: 'SOLD_OUT' });
      }

      // code -3: Waiting list is full
      if (code === -3) {
        throwError(Errors.QUEUE_FULL);
      }

      // code 2: User already has an active (unexpired) slot — return its remaining time.
      if (code === 2) {
        const activeExpiresAt = value;
        const expiresInSeconds = Math.max(1, Math.ceil((activeExpiresAt - now) / 1000));
        const token = await encryptSeatToken({ userId, eventId }, expiresInSeconds);
        return { status: 'active', expiresAt: activeExpiresAt, token };
      }

      // code 3: User is already in the waiting list — return their current position.
      if (code === 3) {
        return { status: 'waiting', position: value };
      }

      // code 1: User was promoted immediately to active — mint a grace-period token.
      if (code === 1) {
        const token = await encryptSeatToken({ userId, eventId }, initialDuration);
        return { status: 'active', expiresAt: value, token };
      }

      // code 0: User was added to the waiting list.
      return { status: 'waiting', position: value };
    });
  },

  async confirmSlot(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const activeKey = `active_users:${eventId}`;
      const now = Date.now();

      /**
       * Atomic Lua script: verifies the user is still active (within the grace period),
       * then extends the slot score in the sorted set and refreshes the TTL on
       * `user_current_queue` to grant the full holding duration.
       */
      const luaScript = `
        local raw = redis.call('ZSCORE', KEYS[1], ARGV[1])
        local currentScore = raw and tonumber(raw) or 0
        local now = tonumber(ARGV[2])
        local eventId = ARGV[3]
        local holdingDuration = tonumber(ARGV[4]) -- e.g. 300 seconds
        local confirmedKey = KEYS[3]

        -- Only extend if the slot is still valid (within grace period).
        if currentScore > now then
          -- If already confirmed, return the existing expiry without extending
          local alreadyConfirmed = redis.call('GET', confirmedKey)
          if alreadyConfirmed then
            return currentScore
          end

          local newExpiresAt = now + (holdingDuration * 1000)
          redis.call('ZADD', KEYS[1], newExpiresAt, ARGV[1])
          redis.call('SET', KEYS[2], eventId, 'EX', holdingDuration + 5)
          redis.call('SET', confirmedKey, '1', 'EX', holdingDuration + 5)
          return newExpiresAt
        end

        return 0
      `;

      const activeExpiresAt = await redis.eval<[string, number, string, number], number>(
        luaScript,
        [activeKey, `user_current_queue:${userId}`, `confirmed:${eventId}:${userId}`],
        [String(userId), now, String(eventId), config.accessTokenDuration],
      );

      if (!activeExpiresAt) {
        throwError(Errors.QUEUE_SESSION_EXPIRED);
      }

      const expiresInSeconds = Math.max(1, Math.ceil((activeExpiresAt - now) / 1000));
      const token = await encryptSeatToken({ userId, eventId }, expiresInSeconds);

      return { expiresAt: activeExpiresAt, token };
    });
  },

  async leaveQueue(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const userCurrentKey = `user_current_queue:${userId}`;
      const activeKey = `active_users:${eventId}`;

      const leaveQueueScript = `
        local currentEvent = redis.call('GET', KEYS[2])
        if not currentEvent or tonumber(currentEvent) == tonumber(ARGV[2]) then
          redis.call('DEL', KEYS[2])
          redis.call('ZREM', KEYS[1], ARGV[1])
          redis.call('ZREM', 'waiting_queue:'..ARGV[2], ARGV[1])
          redis.call('DEL', 'confirmed:'..ARGV[2]..':'..ARGV[1])
          return 1
        end
        return 0
      `;

      const result = (await redis.eval(
        leaveQueueScript,
        [activeKey, userCurrentKey, 'active_event_ids'],
        [String(userId), String(eventId)],
      )) as number;

      return { success: result === 1 };
    });
  },

  async getQueueStatus(userId: number, eventId: number) {
    return await withRedisErrorHandling(async () => {
      const activeKey = `active_users:${eventId}`;
      const waitingKey = `waiting_queue:${eventId}`;
      const confirmedKey = `confirmed:${eventId}:${userId}`;
      const now = Date.now();

      const activeScore = await redis.zscore(activeKey, userId);
      if (activeScore && activeScore > now) {
        const expiresInSeconds = Math.max(1, Math.ceil((activeScore - now) / 1000));
        // Always mint a fresh token so clients are never stuck with an expired one.
        // The client should cache this token and only call /status again when needed.
        const token = await encryptSeatToken({ userId, eventId }, expiresInSeconds);

        // Distinguish grace period (not confirmed) from confirmed holding session.
        // Without this, the floating widget would overwrite 'holding' → 'ready'
        // on every poll, causing the countdown to show the wrong total duration.
        const isConfirmed = !!(await redis.get(confirmedKey));
        return {
          status: isConfirmed ? 'confirmed' : 'active',
          expiresAt: activeScore,
          token,
          remainingSeconds: expiresInSeconds,
        };
      }

      // ── Check if the queue is closed (Sold Out or Paused) ──
      const capKey = `queue:cap:${eventId}`;
      const capRaw = await redis.get(capKey);
      if (capRaw !== null && Number(capRaw) <= 0) {
        // We MUST clean up the user here, otherwise they are stuck in cross-queue limbo
        // even if the frontend redirects them.
        await this.leaveQueue(userId, eventId);
        return { status: 'none' };
      }

      const position = await redis.zrank(waitingKey, userId);
      if (position !== null) {
        return { status: 'waiting', position: position + 1 };
      }

      // Cross-queue check: If not in this event, check if they are in ANY event
      const currentEventId = await redis.get(`user_current_queue:${userId}`);
      if (currentEventId && Number(currentEventId) !== eventId) {
        return { status: 'other', eventId: Number(currentEventId) };
      }

      return { status: 'none' };
    });
  },
};
