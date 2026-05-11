import { requireAuth } from '$lib/server/auth/guards';
import { Errors, throwError } from '$lib/server/errors';
import { apiHandler } from '$lib/server/handler';
import { orderService } from '$lib/server/services/order.service';
import type { TicketQrPayload } from '$lib/types/qr';
import { formatCheckinSecret } from '$lib/utils/format';
import { json } from '@sveltejs/kit';

export const GET = apiHandler(async ({ locals }) => {
  const user = requireAuth(locals);

  if (user.role !== 'customer') {
    throwError(Errors.FORBIDDEN, 'Chỉ khách hàng mới có quyền xem vé của mình');
  }

  const dashboardData = await orderService.getMyOrdersAndTickets(user.id);

  dashboardData.paid_events = dashboardData.paid_events.map((event) => ({
    ...event,
    tickets: event.tickets.map((ticket) => ({
      ...ticket,
      checkin_secret_formatted: formatCheckinSecret(ticket.checkin_secret),
      qr_payload: {
        v: 1,
        e: ticket.event_id,
        s: ticket.show_id,
        k: ticket.checkin_secret, // normalized, no hyphens
      } satisfies TicketQrPayload,
    })),
  }));

  return json({ data: dashboardData }, { status: 200 });
});
