import { eventService } from '$lib/server/services/event.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user;

  try {
    const event = await eventService.getEventDetail(params.id, user?.role, user?.id);

    // Non-admin users should not see draft events
    if (event.status === 'draft' && user?.role !== 'admin') {
      error(404, 'Không tìm thấy sự kiện');
    }

    return {
      event,
    };
  } catch (err: unknown) {
    // Handle AppError from the service
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const appErr = err as { statusCode: number; message: string };
      if (appErr.statusCode === 404) {
        error(404, 'Không tìm thấy sự kiện');
      }
    }
    error(404, 'Không tìm thấy sự kiện');
  }
};
