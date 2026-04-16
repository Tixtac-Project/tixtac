import { seatService } from '$lib/server/services/seat.service';
import { eventService } from '$lib/server/services/event.service';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user;

  if (!user) {
    redirect(302, `/login?redirect=/events/${params.id}/shows/${params.showId}/seats`);
  }

  try {
    const eventId = Number(params.id);
    const showId = Number(params.showId);

    if (isNaN(eventId) || isNaN(showId)) {
      error(400, 'ID không hợp lệ');
    }

    const [event, seatMap] = await Promise.all([
      eventService.getEventDetail(eventId, user.role, user.id),
      seatService.getSeatMap(eventId, showId, user.role),
    ]);

    const show = event.shows.find((s) => s.id === showId);
    if (!show) {
      error(404, 'Không tìm thấy suất diễn');
    }

    return {
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        max_tickets_per_user: event.max_tickets_per_user,
        map_config: event.map_config,
        stage_layout: event.stage_layout,
      },
      show: {
        id: show.id,
        title: show.title,
        show_date: show.show_date,
        start_time: show.start_time,
        end_time: show.end_time,
      },
      seatMap,
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const appErr = err as { statusCode: number; message: string };
      if (appErr.statusCode === 404) {
        error(404, 'Không tìm thấy suất diễn');
      }
      if (appErr.statusCode === 401) {
        redirect(302, `/login?redirect=/events/${params.id}/shows/${params.showId}/seats`);
      }
    }
    error(404, 'Không tìm thấy suất diễn');
  }
};
