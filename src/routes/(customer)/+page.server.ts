import { db } from '$lib/server/db';
import { categories, events, eventShows, seatSections, seats } from '$lib/server/db/schema';
import { and, count, desc, eq, ilike, min, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  // 1. Parse URL params
  const searchQuery = url.searchParams.get('q') || '';
  const categorySlug = url.searchParams.get('category') || '';
  const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
  const page = rawPage > 0 ? rawPage : 1;

  const limit = 8;
  const offset = (page - 1) * limit;

  // 2. Load all categories for the filter bar
  const allCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .orderBy(categories.sortOrder, categories.name);

  // 3. Build WHERE conditions
  const conditions = [eq(events.status, 'published')];
  if (searchQuery) {
    conditions.push(ilike(events.title, `%${searchQuery}%`));
  }
  if (categorySlug) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1);
    if (cat) {
      conditions.push(eq(events.categoryId, cat.id));
    }
  }
  const whereClause = and(...conditions);

  // 4. Featured events (top 6 newest published, with earliest show date & min price)
  const featuredEventsRaw = await db
    .select({
      id: events.id,
      title: events.title,
      venue: events.venue,
      bannerImageUrl: events.bannerImageUrl,
      categoryName: categories.name,
      categorySlug: categories.slug,
      earliestShowDate: min(eventShows.showDate),
      minPrice: min(seatSections.price),
    })
    .from(events)
    .leftJoin(categories, eq(categories.id, events.categoryId))
    .leftJoin(eventShows, eq(eventShows.eventId, events.id))
    .leftJoin(seatSections, eq(seatSections.showId, eventShows.id))
    .where(eq(events.status, 'published'))
    .groupBy(events.id, categories.name, categories.slug)
    .orderBy(desc(events.createdAt))
    .limit(6);

  // 5. Count total matching events
  const [{ total }] = await db.select({ total: count() }).from(events).where(whereClause);

  // 6. Query paginated events with category, earliest show date, min price, seat counts
  const rawEvents = await db
    .select({
      id: events.id,
      title: events.title,
      venue: events.venue,
      bannerImageUrl: events.bannerImageUrl,
      categoryName: categories.name,
      categorySlug: categories.slug,
      earliestShowDate: min(eventShows.showDate),
      minPrice: min(seatSections.price),
      totalSeats: count(sql`CASE WHEN ${seats.status} != 'disabled' THEN 1 END`),
      availableSeats: count(sql`CASE WHEN ${seats.status} = 'available' THEN 1 END`),
    })
    .from(events)
    .leftJoin(categories, eq(categories.id, events.categoryId))
    .leftJoin(eventShows, eq(eventShows.eventId, events.id))
    .leftJoin(seatSections, eq(seatSections.showId, eventShows.id))
    .leftJoin(seats, eq(seats.sectionId, seatSections.id))
    .where(whereClause)
    .groupBy(events.id, categories.name, categories.slug)
    .orderBy(desc(events.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    categories: allCategories,
    featuredEvents: featuredEventsRaw.map((e) => ({
      id: e.id,
      title: e.title,
      venue: e.venue,
      bannerImageUrl: e.bannerImageUrl,
      categoryName: e.categoryName,
      categorySlug: e.categorySlug,
      earliestShowDate: e.earliestShowDate,
      min_price: e.minPrice ? Number(e.minPrice) : 0,
    })),
    events: rawEvents.map((e) => ({
      id: e.id,
      title: e.title,
      venue: e.venue,
      bannerImageUrl: e.bannerImageUrl,
      categoryName: e.categoryName,
      categorySlug: e.categorySlug,
      earliestShowDate: e.earliestShowDate,
      min_price: e.minPrice ? Number(e.minPrice) : 0,
      totalSeats: e.totalSeats,
      availableSeats: e.availableSeats,
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit) || 1,
      searchQuery,
      categorySlug,
      totalItems: total,
    },
  };
};
