import { redis } from '$lib/server/redis';
import { Errors, throwError } from '$lib/server/errors';
import { encryptSeatToken } from '$lib/server/auth/jwt';
import { config } from '$lib/server/config';

export const queueService = {
  async joinQueue(userId: number, eventId: number) {
    console.log(
      `[DEBUG] User ${userId} đang join. Max config hiện tại:`,
      config.maxConcurrentUsers,
    );
    const userCurrentKey = `user_current_queue:${userId}`;
    const activeKey = `active_users:${eventId}`;
    const waitingKey = `waiting_queue:${eventId}`;
    const now = Date.now();

    const currentQueuedEvent = await redis.get<number>(userCurrentKey);
    if (currentQueuedEvent && currentQueuedEvent !== eventId) {
      throwError(Errors.EVENT_NOT_AVAILABLE, 'Bạn đang tham gia hàng chờ của một sự kiện khác');
    }

    const existingScore = await redis.zscore(activeKey, userId);
    if (existingScore && existingScore > now) {
      const token = await encryptSeatToken({ sub: userId, event_id: eventId });
      return { status: 'active', expiresAt: existingScore, token };
    }

    // const activeCount = await redis.zcard(activeKey);
    // const maxUsers = config.maxConcurrentUsers || 200;

    const activeCount = await redis.zcount(activeKey, now, '+inf'); // Chỉ đếm người còn hạn
    const totalInSet = await redis.zcard(activeKey); // Đếm tất cả để đối chiếu
    const maxUsers = config.maxConcurrentUsers || 200;
    console.log(
      `[DEBUG] Event ${eventId}: Còn hạn=${activeCount}, Tổng trong Set=${totalInSet}, Max=${maxUsers}`,
    );

    if (activeCount < maxUsers) {
      const expiresAt = now + 5 * 60 * 1000;
      await redis.zadd(activeKey, { score: expiresAt, member: userId });
      await redis.set(userCurrentKey, eventId, { ex: 600 }); // Lưới an toàn 10 phút

      const token = await encryptSeatToken({ sub: userId, event_id: eventId });
      return { status: 'active', expiresAt, token };
    } else {
      await redis.zadd(waitingKey, { score: now, member: userId });
      await redis.set(userCurrentKey, eventId, { ex: 600 }); // Lưới an toàn 10 phút

      const position = await redis.zrank(waitingKey, userId);
      return { status: 'waiting', position: (position ?? 0) + 1 };
    }
  },

  async confirmSlot(userId: number, eventId: number) {
    const activeKey = `active_users:${eventId}`;
    const now = Date.now();

    const currentScore = await redis.zscore(activeKey, userId);
    if (!currentScore || currentScore < now) {
      throwError(Errors.FORBIDDEN, 'Slot của bạn không tồn tại hoặc đã hết hạn');
    }

    const expiresAt = now + 5 * 60 * 1000;
    await redis.zadd(activeKey, { xx: true }, { score: expiresAt, member: userId });
    await redis.set(`user_current_queue:${userId}`, eventId, { ex: 600 });

    const token = await encryptSeatToken({ sub: userId, event_id: eventId });
    return { expiresAt, token };
  },

  async leaveQueue(userId: number, eventId: number) {
    await redis.del(`user_current_queue:${userId}`);
    await redis.zrem(`active_users:${eventId}`, userId);
    await redis.zrem(`waiting_queue:${eventId}`, userId);
    return { success: true };
  },

  async getQueueStatus(userId: number, eventId: number) {
    const activeKey = `active_users:${eventId}`;
    const waitingKey = `waiting_queue:${eventId}`;
    const now = Date.now();

    const activeScore = await redis.zscore(activeKey, userId);
    if (activeScore && activeScore > now) {
      const token = await encryptSeatToken({ sub: userId, event_id: eventId });
      return { status: 'active', expiresAt: activeScore, token };
    }

    const position = await redis.zrank(waitingKey, userId);
    if (position !== null) {
      return { status: 'waiting', position: position + 1 };
    }

    return { status: 'none' };
  },
};
