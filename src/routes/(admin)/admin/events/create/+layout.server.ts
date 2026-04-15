import { categoryService } from '$lib/server/services/category.service';
import { eventService } from '$lib/server/services/event.service';
import type { LayoutServerLoad } from './$types';

/**
 * Shared layout load for all 3 steps of the create-event flow.
 *
 * - Always loads categories (needed by step 1).
 * - When `?event=<id>` is present, loads the draft event + shows from DB
 *   so that steps 2 & 3 can hydrate without relying solely on sessionStorage.
 */
export const load: LayoutServerLoad = async ({ url, locals }) => {
  const categories = await categoryService.listCategories();

  const eventIdParam = url.searchParams.get('event');
  let event: Awaited<ReturnType<typeof eventService.getEventDetail>> | null = null;

  if (eventIdParam && locals.user) {
    try {
      const detail = await eventService.getEventDetail(
        Number(eventIdParam),
        locals.user.role,
        locals.user.id,
      );
      // Only allow editing draft events in the create flow
      if (detail.status === 'draft') {
        event = detail;
      }
    } catch {
      // Event not found or not accessible — proceed without it
    }
  }

  return { categories, event };
};
