import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { json } from '@sveltejs/kit';

export const GET = apiHandler(async ({ locals }) => {
  const user = requireAdmin(locals);
  return json({ message: 'Chào mừng Admin!', userInfo: user });
});
