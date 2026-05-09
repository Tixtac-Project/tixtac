import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyAuthToken } from '$lib/server/auth/jwt';
import { redis } from '$lib/server/redis';
import { queueService } from '$lib/server/services/queue.service';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('auth_token');
  if (token) {
    try {
      const payload = await verifyAuthToken(token);
      const userId = Number(payload.sub);

      // Look up any active queue slot for this user and release it immediately.
      const eventId = await redis.get(`user_current_queue:${userId}`);
      if (eventId) {
        await queueService.leaveQueue(userId, Number(eventId));
      }
    } catch (err) {
      console.warn('[Logout] Failed to clean up queue:', err);
    }
  }

  cookies.delete('auth_token', { path: '/' });
  return json({ data: { message: 'Đăng xuất thành công' } }, { status: 200 });
};
