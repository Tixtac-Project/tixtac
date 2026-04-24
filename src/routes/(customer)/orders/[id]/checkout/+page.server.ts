import { requireCustomer } from '$lib/server/auth/guards';
import { orderService } from '$lib/server/services/order.service';
import { error, redirect } from '@sveltejs/kit';
import { handlePageError } from '$lib/server/utils/page-error';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireCustomer(locals);
  const orderId = Number(params.id);

  if (isNaN(orderId)) {
    error(400, 'Mã đơn hàng không hợp lệ');
  }

  try {
    const order = await orderService.getOrderDetails(orderId, user.id);

    if (order.status === 'paid') {
      redirect(302, '/me/tickets');
    }

    const isExpired = new Date() > new Date(order.expires_at);

    return {
      order,
      isExpired,
    };
  } catch (err: unknown) {
    handlePageError(err, {
      notFoundMessage: 'Không tìm thấy đơn hàng',
    });
  }
};
