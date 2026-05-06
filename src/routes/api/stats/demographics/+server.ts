import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { statsService } from '$lib/server/services/stats.service';
import { json } from '@sveltejs/kit';

export const GET = apiHandler(async ({ url, locals }) => {
  const admin = requireAdmin(locals);

  const eventId = Number(url.searchParams.get('eventId'));
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const forceRefresh = url.searchParams.get('forceRefresh') === 'true';

  if (!eventId || isNaN(eventId)) {
    return json(
      { error: { code: 'VALIDATION_ERROR', message: 'eventId is required' } },
      { status: 400 },
    );
  }

  const data = await statsService.getDemographics(
    eventId,
    startDate,
    endDate,
    forceRefresh,
    admin.id,
  );
  return json({ data });
});
