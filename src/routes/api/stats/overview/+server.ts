import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { statsService } from '$lib/server/services/stats.service';
import { isValidDate } from '$lib/utils/datetime';
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
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return json(
      { error: { code: 'VALIDATION_ERROR', message: 'startDate/endDate must be valid ISO dates' } },
      { status: 400 },
    );
  }

  const data = await statsService.getOverview(eventId, startDate, endDate, forceRefresh, admin.id);
  return json({ data });
});
