import { json } from '@sveltejs/kit';
import { seatService } from '$lib/server/services/seat.service';
import { apiHandler } from '$lib/server/handler';
import { Errors, throwError } from '$lib/server/errors';
import { validateInput } from '$lib/shared/validation';
import { eventIdSchema, showIdSchema } from '$lib/shared/schemas';

export const GET = apiHandler(async ({ params, locals }) => {
  if (!locals.user) {
    throwError(Errors.UNAUTHORIZED, 'Vui lòng xếp hàng để vào khu vực mua vé');
  }

  const eventId = validateInput(eventIdSchema, params.id);
  const showId = validateInput(showIdSchema, params.showId);

  const result = await seatService.getSeatMap(eventId, showId, locals.user.role);

  return json({ data: result }, { status: 200 });
});
