import { eventService } from '$lib/server/services/event.service';
import { error } from '@sveltejs/kit';
import { handlePageError } from '$lib/server/utils/page-error';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user;

  try {
    const event = await eventService.getEventDetail(params.id, user?.role, user?.id);

    if (event.status === 'draft' && user?.role !== 'admin') {
      error(404, 'Không tìm thấy sự kiện');
    }

    return {
      event,
    };
  } catch (err: unknown) {
    handlePageError(err, {
      notFoundMessage: 'Không tìm thấy sự kiện',
    });
  }
};
