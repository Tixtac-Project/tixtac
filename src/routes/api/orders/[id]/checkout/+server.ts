import { requireCustomer } from '$lib/server/auth/guards';
import { Errors, throwError } from '$lib/server/errors';
import { apiHandler } from '$lib/server/handler';
import { orderService } from '$lib/server/services/order.service';
import { queueService } from '$lib/server/services/queue.service';
import { json, redirect } from '@sveltejs/kit';

export const POST = apiHandler(async ({ params, locals }) => {
  if (!locals.user) {
    redirect(302, `/login?redirectTo=/orders/${params.id}/checkout`);
  }
  const customer = requireCustomer(locals);

  const orderId = Number(params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throwError(Errors.INVALID_ID);
  }

  const data = await orderService.checkout(orderId, customer.id);

  // On successful payment, immediately release the queue slot so the next
  // waiting user can be promoted. The eventId is resolved from the first order item.
  // This is run in a fire-and-forget block to avoid blocking the fast checkout response.
  (async () => {
    try {
      const orderDetails = await orderService.getOrderDetails(orderId, customer.id);
      const eventId = orderDetails.items[0]?.event.id;
      if (eventId) {
        await queueService.leaveQueue(customer.id, eventId);
      }
    } catch (err) {
      console.error('[order_checkout] Failed to cleanup queue slot (non-critical):', err);
    }
  })();

  return json({ data }, { status: 200 });
});
