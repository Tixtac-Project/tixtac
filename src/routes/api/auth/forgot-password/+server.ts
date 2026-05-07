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
    return json({ error: 'Invalid input' }, { status: 400 });
  }
  const { email } = parsed.data;
  const key = `${email}:${getClientAddress()}`;
  const { success } =
    (await forgotPasswordLimiter.limit(key)) &&
    (await forgotPasswordIpLimiter.limit(getClientAddress()));

  if (!success) {
    return json({ error: 'Too many requests' }, { status: 429 });
  }

  await userService.forgotPassword(email, url.origin);

  return json({
    message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn.',
  });
});
