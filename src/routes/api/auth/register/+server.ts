import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/services/auth.service';
import { AppError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // 1. Parse input
    const body = await request.json();

    // 2. Gọi service (Business logic xử lý bên trong)
    const newUser = await authService.register(body);

    // 3. Trả về response
    return json({ data: newUser }, { status: 201 });
  } catch (e) {
    // Bắt lỗi theo chuẩn Pattern Mục 6 và Mục 7
    if (e instanceof AppError) {
      return json({ error: e.message }, { status: e.statusCode });
    }

    console.error('Register Error:', e);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
