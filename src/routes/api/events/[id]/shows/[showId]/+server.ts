import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { seatmapService } from '$lib/server/services/seatmap.service';
import { showService } from '$lib/server/services/show.service';
import { json } from '@sveltejs/kit';

/** PUT — Replace all sections (and their seats) for a specific show */
export const PUT = apiHandler(async ({ request, params, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const showId = Number((params as Record<string, string>).showId);
  const data = await seatmapService.updateShowSections(admin.id, showId, body);
  return json({ data }, { status: 200 });
});

/** PATCH — Update show metadata (date, time, itinerary) */
export const PATCH = apiHandler(async ({ request, params, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const showId = (params as Record<string, string>).showId;
  const data = await showService.updateShow(admin.id, showId, body);
  return json({ data });
});

/** DELETE — Remove a show and its sections/seats */
export const DELETE = apiHandler(async ({ params, locals }) => {
  const admin = requireAdmin(locals);
  const showId = (params as Record<string, string>).showId;
  const data = await showService.deleteShow(admin.id, showId);
  return json({ data });
});
