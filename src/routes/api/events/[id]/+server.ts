import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

export const GET = apiHandler(async ({ params, locals }) => {
  const role = locals.user?.role;
  const userId = locals.user?.id;
  const data = await eventService.getEventDetail(Number(params.id), role, userId);
  return json({ data });
});
