import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete('auth_token', { path: '/' });
  return json({ data: { message: 'Đăng xuất thành công' } }, { status: 200 });
};
