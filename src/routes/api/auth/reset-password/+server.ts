import { apiHandler } from '$lib/server/handler';
import { userService } from '$lib/server/services/user.service';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const resetBodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const POST = apiHandler(async ({ request }) => {
  const body = await request.json();
  const parseResult = resetBodySchema.safeParse(body);

  if (!parseResult.success) {
    return json({ error: 'Invalid input' }, { status: 400 });
  }
  const { token, password } = parseResult.data;
  await userService.resetPassword(token, password);

  return json({
    message: 'Đặt lại mật khẩu thành công',
  });
});
