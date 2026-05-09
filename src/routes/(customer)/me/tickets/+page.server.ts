import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { orderService } from '$lib/server/services/order.service';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;

  // 1. Kiểm tra Authentication
  if (!user) {
    redirect(303, '/login?redirect=/me/tickets');
  }

  // 2. Staff/admin redirected to profile (only customers have tickets)
  if (user.role !== 'customer') {
    redirect(303, '/me/profile');
  }

  // 3. Fetch dữ liệu lịch sử mua vé bằng Service
  const dashboardData = await orderService.getMyOrdersAndTickets(user.id);

  return {
    pendingOrders: dashboardData.pending_orders,
    paidEvents: dashboardData.paid_events,
  };
};
