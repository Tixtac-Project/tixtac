// src/routes/api/orders/[id]/checkout/+server.ts
import { requireCustomer } from '$lib/server/auth/guards';
import { AppError, Errors } from '$lib/server/errors';
import { apiHandler } from '$lib/server/handler';
import { orderService } from '$lib/server/services/order.service';
import { json } from '@sveltejs/kit';

export const POST = apiHandler(async ({ params, locals }) => {
  try {
    const customer = requireCustomer(locals);

    if (!customer) {
      return json({ error: Errors.UNAUTHORIZED }, { status: 401 });
    }

    if (customer.role !== 'customer') {
      return json({ error: Errors.FORBIDDEN }, { status: 403 });
    }

    const orderId = Number(params.id);
    if (!orderId || isNaN(orderId)) {
      return json({ error: Errors.INVALID_ID }, { status: 400 });
    }

    const data = await orderService.checkout(orderId, customer.id);

    return json({ data }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return json({ error: err }, { status: err.statusCode });
    }

    console.error(err);
    return json({ error: Errors.INTERNAL_ERROR }, { status: 500 });
  }
});
