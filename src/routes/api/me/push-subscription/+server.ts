import { json } from '@sveltejs/kit';
import { apiHandler } from '$lib/server/handler';
import { requireCustomer } from '$lib/server/auth/guards';
import { throwError, Errors, AppError } from '$lib/server/errors';
import { redis } from '$lib/server/redis';
import { pushSubscriptionLimiter } from '$lib/server/rate-limiter';
import { z } from 'zod';

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const POST = apiHandler(async ({ request, locals }) => {
  // 1. Rate Limiting Check
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await pushSubscriptionLimiter.limit(ip);
  if (!success) {
    throw new AppError('TOO_MANY_REQUESTS', 429, 'Yêu cầu quá nhanh, vui lòng thử lại sau.');
  }

  // 2. Authentication Check
  const user = requireCustomer(locals);

  // 3. Payload Validation with Zod
  const payload = await request.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(payload);
  if (!parsed.success) {
    throwError(Errors.BAD_REQUEST, 'Thông tin cấu hình Web Push không hợp lệ');
  }
  const subscription = parsed.data;

  // 4. SSRF Prevention
  try {
    const url = new URL(subscription.endpoint);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !isLocal) {
      throw new Error();
    }
  } catch {
    throwError(Errors.BAD_REQUEST, 'Endpoint Push API không hợp lệ');
  }

  // 5. Save to Upstash Redis with 48 hours TTL (172800 seconds)
  await redis.set(`push_sub:${user.id}`, JSON.stringify(subscription), { ex: 172800 });

  return json({ data: { success: true } }, { status: 201 });
});
