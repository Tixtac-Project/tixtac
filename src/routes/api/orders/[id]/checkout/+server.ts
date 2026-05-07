// src/routes/api/orders/[id]/checkout/+server.ts
import { requireCustomer } from '$lib/server/auth/guards';
import { Errors, throwError } from '$lib/server/errors';
import { apiHandler } from '$lib/server/handler';
import { orderService } from '$lib/server/services/order.service';
import { json, redirect } from '@sveltejs/kit';

export const POST = apiHandler(async ({ params, locals }) => {
  if (!locals.user) {
    redirect(302, `/login?redirect=/orders/${params.id}/checkout`);
  }
  const customer = requireCustomer(locals);

  const orderId = Number(params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throwError(Errors.INVALID_ID);
  }

  const data = await orderService.checkout(orderId, customer.id);

  return json({ data }, { status: 200 });
});
