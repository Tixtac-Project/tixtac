import { json } from '@sveltejs/kit';
import { apiHandler } from '$lib/server/handler';
import { requireCustomer } from '$lib/server/auth/guards';
import { queueService } from '$lib/server/services/queue.service';
import { throwError, Errors } from '$lib/server/errors';

export const POST = apiHandler(async ({ params, locals }) => {
  const user = requireCustomer(locals);

  const eventId = Number(params.id);
  if (isNaN(eventId) || eventId <= 0) {
    throwError(Errors.NOT_FOUND, 'Sự kiện không hợp lệ');
  }

  const result = await queueService.joinQueue(user.id, eventId);

  return json({ data: result }, { status: result.status === 'waiting' ? 202 : 200 });
});

/** DELETE /api/events/:id/queue — Leaves (cancels) the current queue slot for the authenticated user. */
export const DELETE = apiHandler(async ({ params, locals }) => {
  const user = requireCustomer(locals);

  const eventId = Number(params.id);
  if (isNaN(eventId) || eventId <= 0) {
    throwError(Errors.NOT_FOUND, 'Sự kiện không hợp lệ');
  }

  await queueService.leaveQueue(user.id, eventId);

  return json({ data: { message: 'Đã rời hàng chờ' } });
});
