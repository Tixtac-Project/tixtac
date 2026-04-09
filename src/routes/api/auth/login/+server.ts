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
      return json(
        {
          error: {
            code: e.code,
            message: e.message,
            ...(e.details && { details: e.details }), // ← include nếu có
          },
        },
        { status: e.statusCode },
      );
    }

    if (e instanceof SyntaxError) {
      return json(
        { error: { code: 'VALIDATION_ERROR', message: 'Định dạng JSON không hợp lệ' } },
        { status: 400 },
      );
    }

    console.error('Login API Error:', e);
    return json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' } }, { status: 500 });
  }
};
