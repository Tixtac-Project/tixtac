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
    if (new Date() > new Date(order.expires_at)) {
      // In a real app, we might want to show an "Expired" state instead of just 404
      error(410, 'Đơn hàng đã hết hạn thanh toán');
    }

    return {
      order,
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
