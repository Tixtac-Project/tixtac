import { apiHandler } from '$lib/server/handler';
import { forgotPasswordIpLimiter, forgotPasswordLimiter } from '$lib/server/rate-limiter';
import { userService } from '$lib/server/services/user.service';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const forgotBodySchema = z.object({ email: z.string().email() });

export const POST = apiHandler(async ({ request, url, getClientAddress }) => {
  const body = await request.json();
  const parsed = forgotBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Email không hợp lệ' }, { status: 400 });
  }
  const { email } = parsed.data;
  const key = `${email}:${getClientAddress()}`;
  const ip = getClientAddress();
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const emailLimit = await forgotPasswordLimiter.limit(key);
  const ipLimit = await forgotPasswordIpLimiter.limit(ip);

  const success = emailLimit.success && ipLimit.success;
  if (!success) {
    return json({ error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.' }, { status: 429 });
  }

  await userService.forgotPassword(email, url.origin, ip, userAgent);

  return json({
    message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn.',
  });
});
