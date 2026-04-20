// src/routes/api/events/[id]/checkout/+server.ts
import { requireCustomer } from '$lib/server/auth/guards';
import { AppError, Errors, throwError } from '$lib/server/errors';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { checkoutBodySchema, eventIdSchema } from '$lib/shared/schemas/event.schema';
import { validateInput } from '$lib/shared/validation';
import { json } from '@sveltejs/kit';

export const POST = apiHandler(async ({ params, request, locals }) => {
  // 1. Xác thực user (bắt buộc đăng nhập)
  const customer = requireCustomer(locals); // hoặc requireAuth tùy theo tên hàm
  const customerId = customer.id;

  // 2. Validate eventId
  const eventId = validateInput(eventIdSchema, params.id);

   const idempotencyKey =
    request.headers.get('Idempotency-Key') ||
    request.headers.get('X-Idempotency-Key') ||
    undefined;

  // 3. Validate request body
  const rawBody = await request.json();
  const body = validateInput(checkoutBodySchema, rawBody);

  // 4. Gọi service
  try {
    const result = await eventService.checkoutEvent(customerId, eventId, body, idempotencyKey);
    return json({ data: result }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return json(
        { error: err.code, message: err.message, details: err.details },
        { status: err.statusCode }
      );
    }

    throwError(Errors.INTERNAL_ERROR);
  }
});
