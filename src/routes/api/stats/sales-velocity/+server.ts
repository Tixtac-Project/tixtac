import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { statsService } from '$lib/server/services/stats.service';

export const GET = apiHandler(async ({ url, locals }) => {
  const admin = requireAdmin(locals);

  const eventId = Number(url.searchParams.get('eventId'));
  const interval = (url.searchParams.get('interval') as 'hour' | 'day' | 'week') || 'day';
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const forceRefresh = url.searchParams.get('forceRefresh') === 'true';

  if (!eventId || isNaN(eventId)) {
    return json(
      { error: { code: 'VALIDATION_ERROR', message: 'eventId is required' } },
      { status: 400 },
    );
  }
  if (!['hour', 'day', 'week'].includes(interval)) {
    return json(
      { error: { code: 'VALIDATION_ERROR', message: 'interval must be hour, day, or week' } },
      { status: 400 },
    );
  }

  const data = await statsService.getSalesVelocity(
    eventId,
    interval,
    startDate,
    endDate,
    forceRefresh,
    admin.id,
  );
  return json({ data });
});
