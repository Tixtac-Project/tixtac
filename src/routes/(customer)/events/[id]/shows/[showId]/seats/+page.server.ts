import { eventService } from '$lib/server/services/event.service';
import { seatService } from '$lib/server/services/seat.service';
import { handlePageError } from '$lib/server/utils/page-error';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user;

  if (!user) {
    redirect(302, `/login?redirect=/events/${params.id}/shows/${params.showId}/seats`);
  }

  const eventId = Number(params.id);
  const showId = Number(params.showId);

  if (isNaN(eventId) || isNaN(showId)) {
    error(400, 'ID không hợp lệ');
  }

  try {
    const [event, seatMap] = await Promise.all([
      eventService.getEventDetail(eventId, user.role, user.id),
      seatService.getSeatMap(eventId, showId, user.role),
    ]);

    const show = event.shows.find((s) => s.id === showId);
    if (!show) {
      error(404, 'Không tìm thấy suất diễn');
    }

    const allShows = event.shows
      .filter((s) => s.status === 'published' || user.role === 'admin')
      .map((s) => ({
        id: s.id,
        title: s.title,
        show_date: s.show_date,
        start_time: s.start_time,
        end_time: s.end_time,
      }));

    return {
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        max_tickets_per_user: event.max_tickets_per_user,
        bought_count: event.bought_count,
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
      allShows,
      seatMap,
    };
  } catch (err: unknown) {
    handlePageError(err, {
      redirectUrl: `/login?redirect=/events/${params.id}/shows/${params.showId}/seats`,
      notFoundMessage: 'Không tìm thấy suất diễn',
    });
  }
};
