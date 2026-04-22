// src/routes/api/events/[id]/checkout/+server.ts
import { requireCustomer } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { purchaseService } from '$lib/server/services/purchase.service';
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
    request.headers.get('Idempotency-Key') || request.headers.get('X-Idempotency-Key') || undefined;

  // 3. Validate request body
  const rawBody = await request.json();
  const body = validateInput(checkoutBodySchema, rawBody);

  // 4. Gọi service (apiHandler handles AppError serialization + unknown-error logging)
  const result = await purchaseService.purchaseTickets(customerId, eventId, body, idempotencyKey);
  return json({ data: result }, { status: 201 });
});
