import { apiHandler } from '$lib/server/handler';
import { userService } from '$lib/server/services/user.service';
import { resetPasswordSchema } from '$lib/shared/schemas/auth.schema';
import { json } from '@sveltejs/kit';

export const POST = apiHandler(async ({ request }) => {
  const body = await request.json();
  const parseResult = resetPasswordSchema.safeParse(body);

  if (!parseResult.success) {
    return json({ error: 'Invalid input' }, { status: 400 });
  }
  const { token, password } = parseResult.data;
  await userService.resetPassword(token, password);

  return json({
    message: 'Đặt lại mật khẩu thành công',
  });
});
