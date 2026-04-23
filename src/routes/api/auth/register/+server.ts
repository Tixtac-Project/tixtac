import { apiHandler } from '$lib/server/handler';
import { authService } from '$lib/server/services/auth.service';
import { json } from '@sveltejs/kit';

export const POST = apiHandler(async ({ request }) => {
  // 1. Parse input
  const body = await request.json();

  // 2. Gọi service (Business logic xử lý bên trong)
  const newUser = await authService.register(body);

  // 3. Trả về response
  return json({ data: newUser }, { status: 201 });
});
