import { db } from '$lib/server/db';
import {
  categories,
  events,
  eventShows,
  orderItems,
  orders,
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
import type { SQL } from 'drizzle-orm';
import { and, count, desc, eq, exists, gte, ilike, inArray, lte, min, sql } from 'drizzle-orm';
import { validateEventRequirements } from '../validators/seat-overlap.validator';
import { insertShowWithSections } from './seatmap.service';

const boughtCountByUserEvent = db
  .select({ count: sql<number>`count(*)` })
  .from(orders)
  .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
  .where(
    and(
      eq(orders.userId, sql.placeholder('userId')),
      eq(orders.status, 'paid'),
      eq(orderItems.eventId, sql.placeholder('eventId')),
    ),
  )
  .prepare('evt_bought_count_by_user_event');

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

export const eventService = {
  async listEvents(params: {
    q?: string;
    category?: string;
    categoryId?: string | number;
    startDate?: string;
    endDate?: string;
    page?: string | number;
    limit?: string | number;
    role?: string;
    userId?: number;
  }) {
    const { q, category, categoryId, startDate, endDate, page, limit } = validateInput(
      eventQuerySchema,
      {
        q: params.q,
        category: params.category,
        categoryId: params.categoryId,
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page,
        limit: params.limit,
      },
    );
    const { role } = params;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: SQL[] = [];

    // Non-admin users see only published events
    if (role !== 'admin') {
      conditions.push(eq(events.status, 'published'));
    }

    if (q) {
      conditions.push(ilike(events.title, `%${q}%`));
    }

    // Filter by category: ID takes priority over slug.
    // If slug is invalid → return empty result set.
    if (categoryId) {
      conditions.push(eq(events.categoryId, Number(categoryId)));
    } else if (category) {
      const [cat] = await categoryBySlug.execute({ slug: category });
      if (!cat) {
        return {
          events: [],
          pagination: { page, limit, total: 0, total_pages: 0 },
        };
      }
      conditions.push(eq(events.categoryId, cat.id));
    }

    // Date range filter using EXISTS — guarantees at least one show falls inside the range
    if (startDate || endDate) {
      const showConds: SQL[] = [eq(eventShows.eventId, events.id)];
      if (startDate) showConds.push(gte(eventShows.showDate, startDate));
      if (endDate) showConds.push(lte(eventShows.showDate, endDate));
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(eventShows)
            .where(and(...showConds)),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Shared select columns — use materialized counters from seat_sections
    const selectCols = {
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
      earliestShowDate: min(eventShows.showDate),
      minPrice: min(seatSections.price),
      totalSeats: sql<number>`COALESCE(SUM(${seatSections.totalSeats}), 0)`,
      availableSeats: sql<number>`COALESCE(SUM(${seatSections.availableSeats}), 0)`,
    };

    // Count query — uses real COUNT(*) instead of fetching all rows
    const [{ total }] = await db
      .select({ total: count() })
      .from(events)
      .leftJoin(categories, eq(categories.id, events.categoryId))
      .where(whereClause);

    // Data query — paginated with full columns
    const rows = await db
      .select(selectCols)
      .from(events)
      .leftJoin(categories, eq(categories.id, events.categoryId))
      .leftJoin(eventShows, eq(eventShows.eventId, events.id))
      .leftJoin(seatSections, eq(seatSections.showId, eventShows.id))
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

  /** Get the top N featured (newest published) events with show date & min price */
  async listFeaturedEvents(limit = 6) {
    const rows = await db
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
      .limit(limit);

    return rows.map((e) => ({
      id: e.id,
      title: e.title,
      venue: e.venue,
      banner_image_url: e.bannerImageUrl,
      category_name: e.categoryName,
      category_slug: e.categorySlug,
      earliest_show_date: e.earliestShowDate,
      min_price: e.minPrice ? Number(e.minPrice) : 0,
    }));
  },

  async getEventDetail(rawEventId: string | number, role?: string, userId?: number) {
    const eventId = validateInput(eventIdSchema, rawEventId);

    // 1. Get event basic info with category (check existence first)
    const [eventRow] = await eventDetailById.execute({ id: eventId });
    if (!eventRow) throwError(Errors.NOT_FOUND);
    const event = eventRow;

    // Draft events are only visible to the admin who created them
    if (event.status === 'draft') {
      if (role !== 'admin' || event.createdBy !== userId) {
        throwError(Errors.NOT_FOUND);
      }
    }

    // 2. Count already-bought (paid) tickets for this user+event
    let boughtCount = 0;
    if (userId) {
      const [bought] = await boughtCountByUserEvent.execute({ userId, eventId });
      boughtCount = Number(bought?.count ?? 0);
    }

    // 3. Get all shows for this event
    const shows = await showsByEventId.execute({ eventId });

    // 4. Get all sections across all shows (uses materialized counters)
    const showIds = shows.map((s) => s.id);
    let allSections: (typeof seatSections.$inferSelect)[] = [];
    if (showIds.length > 0) {
      allSections = await db
        .select()
        .from(seatSections)
        .where(inArray(seatSections.showId, showIds))
        .orderBy(seatSections.sortOrder);
    }

    // 5. Group sections by showId (counters come from materialized columns)
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
          sections: showSections.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            price: Number(s.price),
            capacity: s.capacity,
            layout_config: s.layoutConfig,
            seat_config: s.seatConfig,
            sales_start_at: s.salesStartAt,
            sales_end_at: s.salesEndAt,
            seat_count: s.totalSeats,
            available_count: s.availableSeats,
            disabled_count: s.disabledSeats,
          })),
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
      // Still verify the event exists and belongs to this admin
      const [event] = await eventById.execute({ id: event_id });
      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      return { id: event.id, title: event.title, status: event.status };
    }

    // Race-safe: conditions baked into the UPDATE so another request can't
    // publish the event between SELECT and UPDATE.
    const [updated] = await db
      .update(events)
      .set(updates)
      .where(
        and(eq(events.id, event_id), eq(events.createdBy, adminId), eq(events.status, 'draft')),
      )
      .returning();

    if (!updated) {
      // Fallback: determine the specific error
      const [event] = await eventById.execute({ id: event_id });
      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      if (event.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);
      throwError(Errors.NOT_FOUND);
    }

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
      // Only draft events can be published
      if (event.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

      // Validate every show has inventory — prevent publishing empty shows
      const inventoryRows = await tx
        .select({
          showId: eventShows.id,
          assignedAvailable: sql<number>`
            COALESCE(SUM(
              CASE WHEN ${seatSections.type} = 'assigned'
                THEN ${seatSections.availableSeats}
                ELSE 0
              END
            ), 0)
          `,
          gaCapacity: sql<number>`
            COALESCE(SUM(
              CASE WHEN ${seatSections.type} = 'general'
                THEN ${seatSections.capacity}
                ELSE 0
              END
            ), 0)
          `,
        })
        .from(eventShows)
        .leftJoin(seatSections, eq(seatSections.showId, eventShows.id))
        .where(eq(eventShows.eventId, eventId))
        .groupBy(eventShows.id);

      if (inventoryRows.length === 0) throwError(Errors.NO_SEATS);

      const invalidShow = inventoryRows.find(
        (s) => Number(s.assignedAvailable) <= 0 && Number(s.gaCapacity) <= 0,
      );

      if (invalidShow) throwError(Errors.NO_SEATS);

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
