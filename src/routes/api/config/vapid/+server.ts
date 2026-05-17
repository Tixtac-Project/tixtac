import { json } from '@sveltejs/kit';
import { apiHandler } from '$lib/server/handler';
import { config } from '$lib/server/config';
import { vapidConfigLimiter } from '$lib/server/rate-limiter';
import { AppError } from '$lib/server/errors';

export const GET = apiHandler(async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await vapidConfigLimiter.limit(ip);
  if (!success) {
    throw new AppError('TOO_MANY_REQUESTS', 429, 'Yêu cầu quá nhanh, vui lòng thử lại sau.');
  }

  return json({ data: { publicKey: config.vapidPublicKey } }, { status: 200 });
});

