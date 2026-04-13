import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

/**
 * POST /api/events/create/shows
 * Step 2 (Save Draft): Add shows (sessions) to an existing draft event.
 * Requires event_id from Step 1.
 */
export const POST = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.addShows(admin.id, body);
  return json({ data }, { status: 201 });
});
