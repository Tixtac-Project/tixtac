import { json } from '@sveltejs/kit';
import { apiHandler } from '$lib/server/handler';
import { requireCustomer } from '$lib/server/auth/guards';
import { throwError, Errors } from '$lib/server/errors';
import { redis } from '$lib/server/redis';

export const POST = apiHandler(async ({ request, locals }) => {
  const user = requireCustomer(locals);

  const subscription = await request.json().catch(() => null);
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throwError(Errors.BAD_REQUEST, 'Thông tin cấu hình Web Push không hợp lệ');
  }

  // Save to Upstash Redis with 2 hours TTL (7200 seconds)
  await redis.set(`push_sub:${user.id}`, JSON.stringify(subscription), { ex: 7200 });

  return json({ data: { success: true } }, { status: 201 });
});
