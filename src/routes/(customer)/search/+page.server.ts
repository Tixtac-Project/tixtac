import { categoryService } from '$lib/server/services/category.service';
import { eventService } from '$lib/server/services/event.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  const q = url.searchParams.get('q') || undefined;
  const category = url.searchParams.get('category') || undefined;
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
  const page = rawPage > 0 ? rawPage : 1;

  const [categories, eventsResult] = await Promise.all([
    categoryService.listCategories(),
    eventService.listEvents({
      q,
      category,
      startDate,
      endDate,
      page,
      limit: 12,
      role: locals.user?.role,
      userId: locals.user?.id,
    }),
  ]);

  return {
    categories,
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
      totalItems: eventsResult.pagination.total,
    },
    filters: {
      q: q || '',
      category: category || '',
      startDate: startDate || '',
      endDate: endDate || '',
    },
  };
};
