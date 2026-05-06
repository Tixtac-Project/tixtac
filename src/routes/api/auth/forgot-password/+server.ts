// src/routes/api/auth/forgot-password/+server.ts
import { apiHandler } from '$lib/server/handler';
import { forgotPasswordLimiter } from '$lib/server/rate-limiter';
import { userService } from '$lib/server/services/user.service';
import { json } from '@sveltejs/kit';

export const POST = apiHandler(async ({ request, url, getClientAddress }) => {
  const { email } = await request.json();
  const key = `${email}:${getClientAddress()}`;
  const { success } = await forgotPasswordLimiter.limit(key);

  if (!success) {
    return new Response('Too many requests', { status: 429 });
  }

  await userService.forgotPassword(email, url.origin);

  return json({
    message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn.',
  });
});
