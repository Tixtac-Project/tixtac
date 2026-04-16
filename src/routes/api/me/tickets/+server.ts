import { json } from '@sveltejs/kit';
import { apiHandler } from '$lib/server/handler';
import { requireAuth } from '$lib/server/auth/guards';
import { orderService } from '$lib/server/services/order.service';
import { Errors, throwError } from '$lib/server/errors';

export const GET = apiHandler(async ({ locals }) => {
  const user = requireAuth(locals);

  if (user.role !== 'customer') {
    throwError(Errors.FORBIDDEN, 'Chỉ khách hàng mới có quyền xem vé của mình.');
  }

  const tickets = await orderService.getMyTickets(user.id);

  return json({ data: tickets }, { status: 200 });
});
