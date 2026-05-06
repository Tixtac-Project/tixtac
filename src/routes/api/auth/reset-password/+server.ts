// src/routes/api/auth/reset-password/+server.ts

import { apiHandler } from '$lib/server/handler';
import { userService } from '$lib/server/services/user.service';
import { json } from '@sveltejs/kit';

export const POST = apiHandler(async ({ request }) => {
  const { token, password } = await request.json();

  await userService.resetPassword(token, password);

  return json({
    message: 'Đặt lại mật khẩu thành công',
  });
});
