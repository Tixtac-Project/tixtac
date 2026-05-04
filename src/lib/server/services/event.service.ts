import { db } from '$lib/server/db';
import {
  categories,
  events,
  eventShows,
  orderItems,
  orders,
  seats,
  seatSections,
} from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import {
  createBasicInfoSchema,
  createEventSchema,
  eventIdSchema,
  eventQuerySchema,
  updateBasicInfoSchema,
} from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { and, count, eq, ilike, min, sql } from 'drizzle-orm';
import { validateEventRequirements } from '../validators/seat-overlap.validator';
import { insertShowWithSections } from './seatmap.service';

// Prepared statements — compiled once, reused across requests
const eventById = db
  .select()
  .from(events)
  .where(eq(events.id, sql.placeholder('id')))
  .limit(1)
  .prepare('evt_by_id');

const eventDetailById = db
  .select({
    id: events.id,
    categoryId: events.categoryId,
    categoryName: categories.name,
    categorySlug: categories.slug,
    title: events.title,
    description: events.description,
    termsAndConditions: events.termsAndConditions,
    venue: events.venue,
    bannerImageUrl: events.bannerImageUrl,
    staticMapImageUrl: events.staticMapImageUrl,
    minAge: events.minAge,
    maxTicketsPerUser: events.maxTicketsPerUser,
    mapConfig: events.mapConfig,
    stageLayout: events.stageLayout,
    amenities: events.amenities,
    organizerInfo: events.organizerInfo,
    status: events.status,
    createdBy: events.createdBy,
    createdAt: events.createdAt,
  })
  .from(events)
  .leftJoin(categories, eq(categories.id, events.categoryId))
  .where(eq(events.id, sql.placeholder('id')))
  .limit(1)
  .prepare('evt_detail_by_id');

const categoryBySlug = db
  .select({ id: categories.id })
  .from(categories)
  .where(eq(categories.slug, sql.placeholder('slug')))
  .limit(1)
  .prepare('evt_cat_by_slug');

const showsByEventId = db
  .select()
  .from(eventShows)
  .where(eq(eventShows.eventId, sql.placeholder('eventId')))
  .orderBy(eventShows.showDate, eventShows.startTime)
  .prepare('evt_shows_by_event');

const seatCountsByShowId = db
  .select({
    sectionId: seats.sectionId,
    seatCount: count(),
    availableCount: count(sql`CASE WHEN ${seats.status} = 'available' THEN 1 END`),
    disabledCount: count(sql`CASE WHEN ${seats.status} = 'disabled' THEN 1 END`),
  })
  .from(seats)
  .where(eq(seats.showId, sql.placeholder('showId')))
  .groupBy(seats.sectionId)
  .prepare('evt_seat_counts_by_show');

export const eventService = {
  async listEvents(params: {
    q?: string;
    category?: string;
    page?: string | number;
    limit?: string | number;
    role?: string;
    userId?: number;
  }) {
    const { q, category, page, limit } = validateInput(eventQuerySchema, {
      q: params.q,
      category: params.category,
      page: params.page,
      limit: params.limit,
    });
    const { role } = params;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];

    // Admin sees all events; non-admins see only non-draft
    if (role !== 'admin') {
      conditions.push(sql`${events.status} != 'draft'`);
    }

    if (q) {
      conditions.push(ilike(events.title, `%${q}%`));
    }

    // Filter by category slug
    if (category) {
      const [cat] = await categoryBySlug.execute({ slug: category });
      if (cat) {
        conditions.push(eq(events.categoryId, cat.id));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matching events
    const [{ total }] = await db.select({ total: count() }).from(events).where(whereClause);

    // Query events with category + show/seat aggregation
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        venue: events.venue,
        categoryId: events.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        bannerImageUrl: events.bannerImageUrl,
        minAge: events.minAge,
        maxTicketsPerUser: events.maxTicketsPerUser,
        status: events.status,
        // Earliest show date for display/sorting
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
      .orderBy(min(eventShows.showDate))
      .limit(limit)
      .offset(offset);

    return {
      events: rows.map((r) => ({
        id: r.id,
        title: r.title,
        venue: r.venue,
        category_id: r.categoryId,
        category_name: r.categoryName,
        category_slug: r.categorySlug,
        earliest_show_date: r.earliestShowDate,
        banner_image_url: r.bannerImageUrl,
        min_age: r.minAge,
        max_tickets_per_user: r.maxTicketsPerUser,
        status: r.status,
        min_price: r.minPrice ? Number(r.minPrice) : 0,
        total_seats: r.totalSeats,
        available_seats: r.availableSeats,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  },

  async getEventDetail(rawEventId: string | number, role?: string, userId?: number) {
    const eventId = validateInput(eventIdSchema, rawEventId);

    // 0. Count already-bought (paid) tickets for this user+event
    let boughtCount = 0;
    if (userId) {
      const [bought] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .innerJoin(seats, eq(seats.id, orderItems.seatId))
        .innerJoin(eventShows, eq(eventShows.id, seats.showId))
        .where(
          and(
            eq(orders.userId, userId),
            eq(orders.status, 'paid'),
            eq(eventShows.eventId, eventId),
          ),
        );
      boughtCount = Number(bought?.count ?? 0);
    }

    // 1. Get event basic info with category
    const [eventRow] = await eventDetailById.execute({ id: eventId });

    if (!eventRow) throwError(Errors.NOT_FOUND);
    const event = eventRow;

    // Draft events are only visible to the admin who created them
    if (event.status === 'draft') {
      if (role !== 'admin' || event.createdBy !== userId) {
        throwError(Errors.NOT_FOUND);
      }
    }

    // 2. Get all shows for this event
    const shows = await showsByEventId.execute({ eventId });

    // 3. Get all sections across all shows
    const showIds = shows.map((s) => s.id);
    let allSections: (typeof seatSections.$inferSelect)[] = [];
    if (showIds.length > 0) {
      allSections = await db
        .select()
        .from(seatSections)
        .where(
          sql`${seatSections.showId} IN (${sql.join(
            showIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        )
        .orderBy(seatSections.sortOrder);
    }

    // 4. Aggregate seat counts per section — collect all shows
    const seatCounts: {
      sectionId: number;
      seatCount: number;
      availableCount: number;
      disabledCount: number;
    }[] = [];
    for (const sid of showIds) {
      const rows = await seatCountsByShowId.execute({ showId: sid });
      seatCounts.push(...rows);
    }

    // 5. Build a map for O(1) lookup
    const countsMap = new Map(
      seatCounts.map((sc) => [
        sc.sectionId,
        {
          seat_count: sc.seatCount,
          available_count: sc.availableCount,
          disabled_count: sc.disabledCount,
        },
      ]),
    );

    // 6. Group sections by showId
    const sectionsByShow = new Map<number, typeof allSections>();
    for (const s of allSections) {
      const arr = sectionsByShow.get(s.showId) || [];
      arr.push(s);
      sectionsByShow.set(s.showId, arr);
    }

    return {
      id: event.id,
      bought_count: boughtCount,
      category_id: event.categoryId,
      category_name: event.categoryName,
      category_slug: event.categorySlug,
      title: event.title,
      description: event.description,
      terms_and_conditions: event.termsAndConditions,
      venue: event.venue,
      banner_image_url: event.bannerImageUrl,
      static_map_image_url: event.staticMapImageUrl,
      min_age: event.minAge,
      max_tickets_per_user: event.maxTicketsPerUser,
      map_config: event.mapConfig,
      stage_layout: event.stageLayout,
      amenities: event.amenities,
      organizer_info: event.organizerInfo,
      status: event.status,
      shows: shows.map((show) => {
        const showSections = sectionsByShow.get(show.id) || [];
        return {
          id: show.id,
          title: show.title,
          show_date: show.showDate,
          start_time: show.startTime,
          end_time: show.endTime,
          itinerary: show.itinerary,
          status: show.status,
          sections: showSections.map((s) => {
            const counts = countsMap.get(s.id) || {
              seat_count: 0,
              available_count: 0,
              disabled_count: 0,
            };
            return {
              id: s.id,
              name: s.name,
              type: s.type,
              price: Number(s.price),
              capacity: s.capacity,
              layout_config: s.layoutConfig,
              seat_config: s.seatConfig,
              sales_start_at: s.salesStartAt,
              sales_end_at: s.salesEndAt,
              seat_count: counts.seat_count,
              available_count: counts.available_count,
              disabled_count: counts.disabled_count,
            };
          }),
        };
      }),
    };
  },

  async createEvent(adminId: number, data: unknown) {
    const { shows, ...eventData } = validateInput(createEventSchema, data);

    // Validate sections for each show
    for (const show of shows) {
      validateEventRequirements(show.sections);
    }

    return await db.transaction(async (tx) => {
      const [newEvent] = await tx
        .insert(events)
        .values({
          categoryId: eventData.category_id,
          title: eventData.title,
          description: eventData.description,
          termsAndConditions: eventData.terms_and_conditions || null,
          venue: eventData.venue,
          bannerImageUrl: eventData.banner_image_url || null,
          staticMapImageUrl: eventData.static_map_image_url || null,
          minAge: eventData.min_age ?? 0,
          maxTicketsPerUser: eventData.max_tickets_per_user ?? 0,
          mapConfig: eventData.map_config,
          stageLayout: eventData.stage_layout ?? [],
          amenities: eventData.amenities ?? [],
          organizerInfo: eventData.organizer_info ?? {},
          createdBy: adminId,
          status: 'draft',
        })
        .returning();

      const showResults = [];
      for (const show of shows) {
        const result = await insertShowWithSections(tx, newEvent.id, show);
        showResults.push(result);
      }

      return {
        id: newEvent.id,
        title: newEvent.title,
        status: newEvent.status,
        shows: showResults,
      };
    });
  },

  // ═══════════════════════════════════════════════════
  // STEP-BASED EVENT CREATION (3-step flow)
  // ═══════════════════════════════════════════════════

  /**
   * Step 1: Create a draft event with basic info only (no shows).
   * POST /api/events/create/basic-info
   */
  async createBasicInfo(adminId: number, data: unknown) {
    const eventData = validateInput(createBasicInfoSchema, data);

    const [newEvent] = await db
      .insert(events)
      .values({
        categoryId: eventData.category_id,
        title: eventData.title,
        description: eventData.description,
        termsAndConditions: eventData.terms_and_conditions || null,
        venue: eventData.venue,
        bannerImageUrl: eventData.banner_image_url || null,
        staticMapImageUrl: eventData.static_map_image_url || null,
        minAge: eventData.min_age ?? 0,
        maxTicketsPerUser: eventData.max_tickets_per_user ?? 0,
        mapConfig: eventData.map_config,
        stageLayout: eventData.stage_layout ?? [],
        amenities: eventData.amenities ?? [],
        organizerInfo: eventData.organizer_info ?? {},
        createdBy: adminId,
        status: 'draft',
      })
      .returning();

    return {
      id: newEvent.id,
      title: newEvent.title,
      status: newEvent.status,
    };
  },

  /**
   * PATCH /api/events/create/basic-info
   */
  async updateBasicInfo(adminId: number, data: unknown) {
    const { event_id, ...fields } = validateInput(updateBasicInfoSchema, data);

    const [event] = await eventById.execute({ id: event_id });
    if (!event) throwError(Errors.NOT_FOUND);
    if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
    if (event.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

    // Build partial update — only set fields that were provided
    const updates: Record<string, unknown> = {};
    if (fields.category_id !== undefined) updates.categoryId = fields.category_id;
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.terms_and_conditions !== undefined)
      updates.termsAndConditions = fields.terms_and_conditions || null;
    if (fields.venue !== undefined) updates.venue = fields.venue;
    if (fields.banner_image_url !== undefined)
      updates.bannerImageUrl = fields.banner_image_url || null;
    if (fields.static_map_image_url !== undefined)
      updates.staticMapImageUrl = fields.static_map_image_url || null;
    if (fields.min_age !== undefined) updates.minAge = fields.min_age;
    if (fields.max_tickets_per_user !== undefined)
      updates.maxTicketsPerUser = fields.max_tickets_per_user;
    if (fields.map_config !== undefined) updates.mapConfig = fields.map_config;
    if (fields.stage_layout !== undefined) updates.stageLayout = fields.stage_layout;
    if (fields.amenities !== undefined) updates.amenities = fields.amenities;
    if (fields.organizer_info !== undefined) updates.organizerInfo = fields.organizer_info;

    if (Object.keys(updates).length === 0) {
      return { id: event.id, title: event.title, status: event.status };
    }

    const [updated] = await db
      .update(events)
      .set(updates)
      .where(eq(events.id, event_id))
      .returning();

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
    };
  },

  async publishEvent(adminId: number, eventId: number) {
    return await db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1)
        .for('update');
      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      if (event.status === 'published') throwError(Errors.ALREADY_PUBLISHED);

      // Check that at least one show has available seats (assigned) or capacity (GA)
      const showList = await tx
        .select({ id: eventShows.id })
        .from(eventShows)
        .where(eq(eventShows.eventId, eventId));

      if (showList.length === 0) throwError(Errors.NO_SEATS);

      const showIds = showList.map((s) => s.id);

      // Check for assigned seats availability
      const [hasAssignedSeats] = await tx
        .select()
        .from(seats)
        .where(
          and(
            sql`${seats.showId} IN (${sql.join(
              showIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
            eq(seats.status, 'available'),
          ),
        )
        .limit(1);

      // Check for GA sections with capacity > 0
      const [hasGACapacity] = await tx
        .select()
        .from(seatSections)
        .where(
          and(
            sql`${seatSections.showId} IN (${sql.join(
              showIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
            eq(seatSections.type, 'general'),
            sql`${seatSections.capacity} > 0`,
          ),
        )
        .limit(1);

      if (!hasAssignedSeats && !hasGACapacity) throwError(Errors.NO_SEATS);

      // Publish the event and all its draft shows
      const [updated] = await tx
        .update(events)
        .set({ status: 'published' })
        .where(eq(events.id, eventId))
        .returning();

      await tx
        .update(eventShows)
        .set({ status: 'published' })
        .where(and(eq(eventShows.eventId, eventId), eq(eventShows.status, 'draft')));

      return { id: updated.id, status: updated.status };
    });
  },
};
