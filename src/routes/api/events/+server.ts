import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

export const POST = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.createEvent(admin.id, body);
  return json({ data }, { status: 201 });
});
