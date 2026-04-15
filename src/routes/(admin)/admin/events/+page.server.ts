import { categoryService } from '$lib/server/services/category.service';
import { eventService } from '$lib/server/services/event.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  const q = url.searchParams.get('q') ?? undefined;
  const category = url.searchParams.get('category') ?? undefined;
  const page = url.searchParams.get('page') ?? undefined;
  const limit = url.searchParams.get('limit') ?? undefined;

  const [result, categories] = await Promise.all([
    eventService.listEvents({
      q,
      category,
      page,
      limit,
      role: locals.user?.role,
      userId: locals.user?.id,
    }),
    categoryService.listCategories(),
  ]);

  return {
    ...result,
    categories,
  };
};
