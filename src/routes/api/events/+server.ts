import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { eventService } from '$lib/server/services/event.service';
import { json } from '@sveltejs/kit';

export const GET = apiHandler(async ({ url, locals }) => {
  const role = locals.user?.role;
  const userId = locals.user?.id;
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');

  const data = await eventService.listEvents({
    q: url.searchParams.get('q') ?? undefined,
    page: pageParam !== null && !Number.isNaN(Number(pageParam)) ? Number(pageParam) : undefined,
    limit: limitParam !== null && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : undefined,
    role,
    userId,
  });
  return json({ data });
});

export const POST = apiHandler(async ({ request, locals }) => {
  const admin = requireAdmin(locals);
  const body = await request.json();
  const data = await eventService.createEvent(admin.id, body);
  return json({ data }, { status: 201 });
});
