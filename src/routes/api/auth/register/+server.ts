import { AppError } from '$lib/server/errors';
import { authService } from '$lib/server/services/auth.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // 1. Parse input
    const body = await request.json();

    // 2. Gọi service (Business logic xử lý bên trong)
    const newUser = await authService.register(body);

    // 3. Trả về response
    return json({ data: newUser }, { status: 201 });
  } catch (e: unknown) {
    // Bắt lỗi theo chuẩn Pattern Mục 6 và Mục 7
    if (e instanceof SyntaxError) {
      return json(
        { error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON' } },
        { status: 400 },
      );
    }
    if (e instanceof AppError) {
      return json(
        {
          error: {
            code: e.code,
            message: e.message,
            ...(e.details && { details: e.details }),
          },
        },
        { status: e.statusCode },
      );
    }

    console.error('Register Error:', e);
    return json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } },
      { status: 500 },
    );
  }
};
