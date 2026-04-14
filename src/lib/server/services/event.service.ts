import { db } from '$lib/server/db';
import { categories, events, eventShows, seats, seatSections } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import {
  addSeatmapSchema,
  addShowsSchema,
  createBasicInfoSchema,
  createEventSchema,
  eventIdSchema,
  eventQuerySchema,
  showIdSchema,
  updateBasicInfoSchema,
  updateShowSchema,
  updateShowSectionsSchema,
  type SectionInput,
  type ShowInput,
} from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { getRowLabel } from '$lib/utils/seat-label';
import { and, count, eq, ilike, min, sql, type InferInsertModel } from 'drizzle-orm';
import { validateEventRequirements } from '../validators/seat-overlap.validator';

/**
 * Max seats per INSERT statement.
 * Each seat row has ~7 columns → ~7 params. PG max params = 65535 → ~9k rows.
 * We use 5000 as a safe, performant batch size.
 */
export const SEAT_INSERT_BATCH_SIZE = 5000;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Insert all sections + their seats in bulk for a given show.
 *
 * Optimised path:
 * 1. Single INSERT for all sections → 1 round-trip
 * 2. Collect ALL seat rows across every section in memory
 * 3. Batch-INSERT all seats in chunks of BATCH_SIZE → minimal round-trips
 *
 * GA (general admission) sections skip seat generation entirely — they use capacity only.
 */
async function insertSectionsWithSeats(
  tx: DbTransaction,
  showId: number,
  sections: SectionInput[],
) {
  // ── 1. Bulk-insert all sections in one statement ──
  const insertedSections = await tx
    .insert(seatSections)
    .values(
      sections.map((sec) => ({
        showId,
        name: sec.name,
        type: sec.type ?? 'assigned',
        isSeatPickable: sec.is_seat_pickable ?? true,
        capacity: sec.capacity ?? 0,
        price: String(sec.price),
        sortOrder: sec.sort_order,
        layoutConfig: sec.layout_config,
        seatConfig: sec.seat_config,
        salesStartAt: sec.sales_start_at ? new Date(sec.sales_start_at) : null,
        salesEndAt: sec.sales_end_at ? new Date(sec.sales_end_at) : null,
      })),
    )
    .returning();

  // ── 2. Generate all seat rows in memory ──
  const allSeats: InferInsertModel<typeof seats>[] = [];
  let total_seats = 0;
  let total_available_seats = 0;
  const sectionsInfo = [];

  for (let idx = 0; idx < sections.length; idx++) {
    const sec = sections[idx];
    const dbSection = insertedSections[idx];
    const seatCfg = sec.seat_config;
    const sectionType = sec.type ?? 'assigned';

    // For GA sections, skip individual seat generation — use capacity only
    if (sectionType === 'general') {
      sectionsInfo.push({
        id: dbSection.id,
        name: dbSection.name,
        type: sectionType,
        capacity: sec.capacity ?? 0,
        seat_count: 0,
        available_count: 0,
        disabled_count: 0,
      });
      continue;
    }

    const prefix = seatCfg.prefix || '';
    const startRow = seatCfg.startRowIndex ?? 1;
    const startCol = seatCfg.startColIndex ?? 1;
    const disabledSet = new Set(sec.disabled_seats ?? []);
    let disabled_count = 0;

    for (let r = 0; r < seatCfg.rows; r++) {
      const rowLabel =
        seatCfg.rowFormat === 'alphabetic' ? getRowLabel(startRow + r - 1) : String(startRow + r);

      for (let c = 0; c < seatCfg.cols; c++) {
        const colNumber =
          seatCfg.colDirection === 'ltr' ? startCol + c : startCol + (seatCfg.cols - 1 - c);

        const prefixStr = prefix ? `${prefix}-` : '';
        const seatKey = `${prefixStr}${rowLabel}${colNumber}`;
        const isDisabled = disabledSet.has(seatKey);
        if (isDisabled) disabled_count++;

        allSeats.push({
          showId,
          sectionId: dbSection.id,
          prefix,
          rowLabel,
          colNumber,
          status: isDisabled ? 'disabled' : 'available',
        });
      }
    }

    const seat_count = seatCfg.rows * seatCfg.cols;
    const available_count = seat_count - disabled_count;
    total_seats += seat_count;
    total_available_seats += available_count;

    sectionsInfo.push({
      id: dbSection.id,
      name: dbSection.name,
      type: sectionType,
      capacity: 0,
      seat_count,
      available_count,
      disabled_count,
    });
  }

  // ── 3. Batch-insert all seats ──
  for (let i = 0; i < allSeats.length; i += SEAT_INSERT_BATCH_SIZE) {
    await tx.insert(seats).values(allSeats.slice(i, i + SEAT_INSERT_BATCH_SIZE));
  }

  return { total_seats, total_available_seats, sectionsInfo };
}

/**
 * Insert a show and its sections+seats within a transaction.
 */
async function insertShowWithSections(tx: DbTransaction, eventId: number, show: ShowInput) {
  const [newShow] = await tx
    .insert(eventShows)
    .values({
      eventId,
      title: show.title || null,
      showDate: show.show_date,
      startTime: new Date(show.start_time),
      endTime: show.end_time ? new Date(show.end_time) : null,
      itinerary: show.itinerary ?? [],
      status: 'draft',
    })
    .returning();

  const { total_seats, total_available_seats, sectionsInfo } = await insertSectionsWithSeats(
    tx,
    newShow.id,
    show.sections,
  );

  return {
    id: newShow.id,
    title: newShow.title,
    show_date: newShow.showDate,
    start_time: newShow.startTime,
    end_time: newShow.endTime,
    status: newShow.status,
    total_seats,
    total_available_seats,
    sections: sectionsInfo,
  };
}

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
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, category))
        .limit(1);
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

    // 1. Get event basic info with category
    const [eventRow] = await db
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
      .where(eq(events.id, eventId))
      .limit(1);

    if (!eventRow) throwError(Errors.NOT_FOUND);
    const event = eventRow;

    // Draft events are only visible to the admin who created them
    if (event.status === 'draft') {
      if (role !== 'admin' || event.createdBy !== userId) {
        throwError(Errors.NOT_FOUND);
      }
    }

    // 2. Get all shows for this event
    const shows = await db
      .select()
      .from(eventShows)
      .where(eq(eventShows.eventId, eventId))
      .orderBy(eventShows.showDate, eventShows.startTime);

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

    // 4. Aggregate seat counts per section in a single query (avoid N+1)
    let seatCounts: {
      sectionId: number;
      seatCount: number;
      availableCount: number;
      disabledCount: number;
    }[] = [];
    if (showIds.length > 0) {
      seatCounts = await db
        .select({
          sectionId: seats.sectionId,
          seatCount: count(),
          availableCount: count(sql`CASE WHEN ${seats.status} = 'available' THEN 1 END`),
          disabledCount: count(sql`CASE WHEN ${seats.status} = 'disabled' THEN 1 END`),
        })
        .from(seats)
        .where(
          sql`${seats.showId} IN (${sql.join(
            showIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        )
        .groupBy(seats.sectionId);
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
              is_seat_pickable: s.isSeatPickable,
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

  async updateShowSections(adminId: number, showId: number, data: unknown) {
    const { sections } = validateInput(updateShowSectionsSchema, data);
    validateEventRequirements(sections);

    return await db.transaction(async (tx) => {
      // Get the show and its parent event
      const [show] = await tx
        .select()
        .from(eventShows)
        .where(eq(eventShows.id, showId))
        .limit(1)
        .for('update');
      if (!show) throwError(Errors.NOT_FOUND);

      const [event] = await tx.select().from(events).where(eq(events.id, show.eventId)).limit(1);
      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      if (show.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

      // Delete existing seats and sections for this show
      await tx.delete(seats).where(eq(seats.showId, showId));
      await tx.delete(seatSections).where(eq(seatSections.showId, showId));

      const { total_seats, total_available_seats, sectionsInfo } = await insertSectionsWithSeats(
        tx,
        showId,
        sections,
      );

      return {
        show_id: show.id,
        event_id: event.id,
        event_title: event.title,
        show_status: show.status,
        total_seats,
        total_available_seats,
        sections: sectionsInfo,
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

    const [event] = await db.select().from(events).where(eq(events.id, event_id)).limit(1);
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

  /**
   * Step 2: Add shows (sessions) to an existing draft event.
   * POST /api/events/create/shows
   */
  async addShows(adminId: number, data: unknown) {
    const { event_id, shows } = validateInput(addShowsSchema, data);

    // Verify event exists, belongs to admin, and is draft
    const [event] = await db.select().from(events).where(eq(events.id, event_id)).limit(1);

    if (!event) throwError(Errors.NOT_FOUND);
    if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
    if (event.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

    return await db.transaction(async (tx) => {
      // Delete existing shows (and their sections/seats) to prevent duplicates
      // when user navigates back to Step 2 and re-submits
      const existingShows = await tx
        .select({ id: eventShows.id })
        .from(eventShows)
        .where(eq(eventShows.eventId, event_id));

      if (existingShows.length > 0) {
        const existingShowIds = existingShows.map((s) => s.id);
        // Delete seats first (FK dependency)
        await tx.delete(seats).where(
          sql`${seats.showId} IN (${sql.join(
            existingShowIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
        // Delete sections
        await tx.delete(seatSections).where(
          sql`${seatSections.showId} IN (${sql.join(
            existingShowIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
        // Delete the shows themselves
        await tx.delete(eventShows).where(eq(eventShows.eventId, event_id));
      }

      const insertedShows = await tx
        .insert(eventShows)
        .values(
          shows.map((show) => ({
            eventId: event_id,
            title: show.title || null,
            showDate: show.show_date,
            startTime: new Date(show.start_time),
            endTime: show.end_time ? new Date(show.end_time) : null,
            itinerary: show.itinerary ?? [],
            status: 'draft' as const,
          })),
        )
        .returning();

      return {
        event_id,
        shows: insertedShows.map((s) => ({
          id: s.id,
          title: s.title,
          show_date: s.showDate,
          start_time: s.startTime,
          end_time: s.endTime,
          status: s.status,
        })),
      };
    });
  },

  /**
   * Step 3: Add seatmap (sections + seats) to a specific show.
   * POST /api/events/create/seatmap
   */
  async addSeatmap(adminId: number, data: unknown) {
    const { show_id, sections } = validateInput(addSeatmapSchema, data);
    validateEventRequirements(sections);

    return await db.transaction(async (tx) => {
      // Verify show exists & belongs to admin's draft event
      const [show] = await tx
        .select()
        .from(eventShows)
        .where(eq(eventShows.id, show_id))
        .limit(1)
        .for('update');
      if (!show) throwError(Errors.NOT_FOUND);

      const [event] = await tx.select().from(events).where(eq(events.id, show.eventId)).limit(1);
      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      if (show.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

      // Clear any existing sections/seats for this show (idempotent)
      await tx.delete(seats).where(eq(seats.showId, show_id));
      await tx.delete(seatSections).where(eq(seatSections.showId, show_id));

      const { total_seats, total_available_seats, sectionsInfo } = await insertSectionsWithSeats(
        tx,
        show_id,
        sections,
      );

      return {
        show_id: show.id,
        event_id: event.id,
        event_title: event.title,
        show_status: show.status,
        total_seats,
        total_available_seats,
        sections: sectionsInfo,
      };
    });
  },

  /**
   * Update a show's metadata (date, time, itinerary).
   * PATCH /api/events/create/shows
   */
  async updateShow(adminId: number, rawShowId: string | number, data: unknown) {
    const showId = validateInput(showIdSchema, rawShowId);
    const fields = validateInput(updateShowSchema, data);

    const [show] = await db.select().from(eventShows).where(eq(eventShows.id, showId)).limit(1);
    if (!show) throwError(Errors.NOT_FOUND);

    const [event] = await db.select().from(events).where(eq(events.id, show.eventId)).limit(1);
    if (!event) throwError(Errors.NOT_FOUND);
    if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
    if (show.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) updates.title = fields.title || null;
    if (fields.show_date !== undefined) updates.showDate = fields.show_date;
    if (fields.start_time !== undefined) updates.startTime = new Date(fields.start_time);
    if (fields.end_time !== undefined)
      updates.endTime = fields.end_time ? new Date(fields.end_time) : null;
    if (fields.itinerary !== undefined) updates.itinerary = fields.itinerary;

    if (Object.keys(updates).length === 0) {
      return {
        id: show.id,
        title: show.title,
        show_date: show.showDate,
        start_time: show.startTime,
        end_time: show.endTime,
        status: show.status,
      };
    }

    const [updated] = await db
      .update(eventShows)
      .set(updates)
      .where(eq(eventShows.id, showId))
      .returning();

    return {
      id: updated.id,
      title: updated.title,
      show_date: updated.showDate,
      start_time: updated.startTime,
      end_time: updated.endTime,
      status: updated.status,
    };
  },

  /**
   * Delete a show and its sections/seats (cascade).
   * DELETE /api/events/[id]/shows/[showId]
   */
  async deleteShow(adminId: number, rawShowId: string | number) {
    const showId = validateInput(showIdSchema, rawShowId);

    return await db.transaction(async (tx) => {
      const [show] = await tx
        .select()
        .from(eventShows)
        .where(eq(eventShows.id, showId))
        .limit(1)
        .for('update');
      if (!show) throwError(Errors.NOT_FOUND);

      const [event] = await tx.select().from(events).where(eq(events.id, show.eventId)).limit(1);
      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      if (show.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

      // Seats cascade from sections, sections cascade from show
      await tx.delete(seats).where(eq(seats.showId, showId));
      await tx.delete(seatSections).where(eq(seatSections.showId, showId));
      await tx.delete(eventShows).where(eq(eventShows.id, showId));

      return { id: showId, event_id: event.id };
    });
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
