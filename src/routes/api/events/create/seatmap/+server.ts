import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

/**
 * POST /api/events/create/seatmap
 * Step 3 (Save Draft): Add seatmap (sections + seats) to a specific show.
 * Requires show_id from Step 2.
 */
export const POST = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.addSeatmap(admin.id, body);
  return json({ data }, { status: 201 });
});
