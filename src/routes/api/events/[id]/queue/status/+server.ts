import { json } from '@sveltejs/kit';
import { apiHandler } from '$lib/server/handler';
import { requireCustomer } from '$lib/server/auth/guards';
import { queueService } from '$lib/server/services/queue.service';
import { throwError, Errors } from '$lib/server/errors';

export const GET = apiHandler(async ({ params, locals }) => {
  const user = requireCustomer(locals);

  const eventId = Number(params.id);
  if (isNaN(eventId) || eventId <= 0) {
    throwError(Errors.NOT_FOUND, 'Sự kiện không hợp lệ');
  }

  const result = await queueService.getQueueStatus(user.id, eventId);

  return json(
    { data: result },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  );
});
