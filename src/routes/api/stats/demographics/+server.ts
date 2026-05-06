import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { statsService } from '$lib/server/services/stats.service';
import { isValidDate } from '$lib/utils/datetime';
import { json } from '@sveltejs/kit';

export const GET = apiHandler(async ({ url, locals }) => {
  const admin = requireAdmin(locals);

  const rawId = url.searchParams.get('eventId');
  const eventId = rawId && !isNaN(Number(rawId)) ? Number(rawId) : null;
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const forceRefresh = url.searchParams.get('forceRefresh') === 'true';

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return json(
      { error: { code: 'VALIDATION_ERROR', message: 'startDate/endDate must be valid ISO dates' } },
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
  return json(
    { data },
    {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
      },
    },
  );
});
