import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

export const PATCH = apiHandler(async ({ params, locals }) => {
  const admin = requireAdmin(locals);
  const data = await eventService.publishEvent(admin.id, Number(params.id));
  return json({ data }, { status: 200 });
});
