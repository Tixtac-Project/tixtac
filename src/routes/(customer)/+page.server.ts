import { categoryService } from '$lib/server/services/category.service';
import { eventService } from '$lib/server/services/event.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
  const page = rawPage > 0 ? rawPage : 1;

  const [categories, featuredEvents, eventsResult] = await Promise.all([
    categoryService.listCategories(),
    eventService.listFeaturedEvents(6),
    eventService.listEvents({
      page,
      limit: 8,
    }),
  ]);

  return {
    categories,
    featuredEvents,
    events: eventsResult.events.map((e) => ({
      id: e.id,
      title: e.title,
      venue: e.venue,
      bannerImageUrl: e.banner_image_url,
      categoryName: e.category_name,
      categorySlug: e.category_slug,
      earliestShowDate: e.earliest_show_date,
      min_price: e.min_price,
      totalSeats: e.total_seats,
      availableSeats: e.available_seats,
    })),
    pagination: {
      currentPage: eventsResult.pagination.page,
      totalPages: eventsResult.pagination.total_pages,
    },
  };
};
