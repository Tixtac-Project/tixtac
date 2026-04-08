// src/routes/api/auth/login/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/services/auth.service';
import { AppError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();

    // Gọi Service
    const { user, token } = await authService.login(body);

    cookies.set('auth_token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400, // 24 giờ
    });

    return json({ data: user }, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof AppError) {
      // Trả về đúng format error được yêu cầu
      return json({ error: { code: e.code, message: e.message } }, { status: e.statusCode });
    }

    console.error('Login API Error:', e);
    return json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' } }, { status: 500 });
  }
};
