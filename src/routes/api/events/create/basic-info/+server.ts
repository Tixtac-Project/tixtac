import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

/**
 * POST /api/events/create/basic-info
 * Step 1 (New Draft): Create a new draft event with basic info only (no shows).
 * Returns the event ID so the client can store it and continue later.
 */
export const POST = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.createBasicInfo(admin.id, body);
  return json({ data }, { status: 201 });
});

/**
 * PATCH /api/events/create/basic-info
 * Step 1b (Update Draft): Update an existing draft event's basic info.
 * Body must include `event_id`. Only provided fields are updated.
 */
export const PATCH = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.updateBasicInfo(admin.id, body);
  return json({ data });
});
