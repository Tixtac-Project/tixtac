import { config } from '$lib/server/config';
import { apiHandler } from '$lib/server/handler';
import { authService } from '$lib/server/services/auth.service';
import { json } from '@sveltejs/kit';

export const POST = apiHandler(async ({ request, cookies }) => {
  const body = await request.json();
  const { user, token } = await authService.login(body);

  cookies.set('auth_token', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !config.isDev,
    maxAge: 86400,
  });

  return json({ data: user }, { status: 200 });
});
