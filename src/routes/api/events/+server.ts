import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

export const GET = apiHandler(async ({ url, locals }) => {
  const role = locals.user?.role;
  const data = await eventService.listEvents({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.has('page') ? Number(url.searchParams.get('page')) : undefined,
    limit: url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : undefined,
    role,
  });
  return json({ data });
});

export const POST = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.createEvent(admin.id, body);
  return json({ data }, { status: 201 });
});
