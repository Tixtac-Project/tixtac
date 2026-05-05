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

  const result = await queueService.confirmSlot(user.id, eventId);

  return json({ data: result });
});
