import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

export const PUT = apiHandler(async ({ request, params, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.updateEventSections(admin.id, Number(params.id), body);
  return json({ data }, { status: 200 });
});
