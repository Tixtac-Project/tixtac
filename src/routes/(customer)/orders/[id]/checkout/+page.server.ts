import { requireCustomer } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';
import { orderService } from '$lib/server/services/order.service';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireCustomer(locals);
  const orderId = Number(params.id);

  if (isNaN(orderId)) {
    error(400, 'Mã đơn hàng không hợp lệ');
  }

  try {
    const order = await orderService.getOrderDetails(orderId, user.id);

    // If order is already paid, redirect to tickets page
    if (order.status === 'paid') {
      redirect(302, '/me/tickets');
    }

    // Check if order expired
    const isExpired = new Date() > new Date(order.expires_at);

    return {
      order,
      isExpired,
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
      throw err;
    }
    if (err instanceof AppError) {
      if (err.statusCode === 404) {
        error(404, 'Không tìm thấy đơn hàng');
      }
      error(err.statusCode, err.message);
    }
    throw err;
  }
};
