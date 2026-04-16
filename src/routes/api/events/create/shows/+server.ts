import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

/**
 * POST /api/events/create/shows
 * Step 2 (Create): Add shows to a draft event that has no shows yet.
 * Deletes any stale shows and creates fresh ones.
 */
export const POST = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.addShows(admin.id, body);
  return json({ data }, { status: 201 });
});

/**
 * PUT /api/events/create/shows
 * Step 2 (Edit): Update shows for an existing draft event.
 * Updates in-place to preserve sections/seats, handles additions and removals.
 */
export const PUT = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.updateShows(admin.id, body);
  return json({ data });
});
