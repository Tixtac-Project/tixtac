import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { orderService } from '$lib/server/services/order.service';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;

  // 1. Kiểm tra Authentication
  if (!user) {
    redirect(303, '/login');
  }

  // 2. Nếu là Admin vào đây thì cũng đưa về trang chủ
  if (user.role !== 'customer') {
    redirect(303, '/');
  }

  // 3. Fetch dữ liệu lịch sử mua vé bằng Service
  const dashboardData = await orderService.getMyOrdersAndTickets(user.id);

  return {
    pendingOrders: dashboardData.pending_orders,
    paidEvents: dashboardData.paid_events,
  };
};
