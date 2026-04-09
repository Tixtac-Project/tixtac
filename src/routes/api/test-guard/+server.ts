import { json } from '@sveltejs/kit';
import { requireAuth, requireAdmin } from '$lib/server/auth/guards';

export const GET = async ({ locals }) => {
  // 1. Nếu qua được hàm này, tức là khách đã đăng nhập (Có token)
  const user = requireAuth(locals);

  // 2. Chặn lại nếu không phải Admin
  requireAdmin(locals);

  // 3. Nếu lọt xuống tới đây, chắc chắn 100% người này là Admin
  return json({
    message: 'Chào mừng Admin!',
    userInfo: user,
  });
};
