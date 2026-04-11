import { db } from '$lib/server/db';
import { events, seatSections, seats } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import {
  createEventSchema,
  eventIdSchema,
  eventQuerySchema,
  updateSectionsSchema,
  type SectionInput,
} from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { getRowLabel } from '$lib/utils/seat-label';
import { and, count, eq, ilike, min, sql, type InferInsertModel } from 'drizzle-orm';
import { validateEventRequirements } from '../validators/seat-overlap.validator';

/**
 * Max seats per INSERT statement.
 * Each seat row has 6 columns → 6 params. PG max params = 65535 → ~10k rows.
 * We use 5000 as a safe, performant batch size.
 */
export const SEAT_INSERT_BATCH_SIZE = 5000;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Insert all sections + their seats in bulk.
 *
 * Optimised path:
 * 1. Single INSERT for all sections → 1 round-trip
 * 2. Collect ALL seat rows across every section in memory
 * 3. Batch-INSERT all seats in chunks of BATCH_SIZE → minimal round-trips
 */
async function insertSectionsWithSeats(
  tx: DbTransaction,
  eventId: number,
  sections: SectionInput[],
) {
  // ── 1. Bulk-insert all sections in one statement ──
  const insertedSections = await tx
    .insert(seatSections)
    .values(
      sections.map((sec) => ({
        eventId,
        name: sec.name,
        prefix: sec.prefix,
        type: sec.type ?? 'assigned',
        isSeatPickable: sec.is_seat_pickable ?? true,
        rows: sec.rows,
        cols: sec.cols,
        price: String(sec.price),
        layoutX: sec.layout_x,
        layoutY: sec.layout_y,
        startRowIndex: sec.start_row_index,
        startColIndex: sec.start_col_index,
        sortOrder: sec.sort_order,
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

    // Sanity check: ensure RETURNING order matches VALUES order
    if (dbSection.prefix !== sec.prefix) {
      throw new Error(
        `Section order mismatch at index ${idx}: expected prefix "${sec.prefix}", got "${dbSection.prefix}"`,
      );
    }

    const prefix = sec.prefix;
    const startRow = sec.start_row_index ?? 0;
    const startCol = sec.start_col_index ?? 1;
    const disabledSet = new Set(sec.disabled_seats ?? []);
    let disabled_count = 0;

    for (let r = 0; r < sec.rows; r++) {
      const rowLabel = getRowLabel(startRow + r);
      for (let c = 0; c < sec.cols; c++) {
        const colNumber = startCol + c;
        const seatKey = `${prefix}-${rowLabel}${colNumber}`;
        const isDisabled = disabledSet.has(seatKey);
        if (isDisabled) disabled_count++;

        allSeats.push({
          eventId,
          sectionId: dbSection.id,
          prefix,
          rowLabel,
          colNumber,
          status: isDisabled ? 'disabled' : 'available',
        });
      }
    }

    const seat_count = sec.rows * sec.cols;
    const available_count = seat_count - disabled_count;
    total_seats += seat_count;
    total_available_seats += available_count;

    sectionsInfo.push({
      id: dbSection.id,
      name: dbSection.name,
      rows: dbSection.rows,
      cols: dbSection.cols,
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

export const eventService = {
  async listEvents(params: {
    q?: string;
    page?: string | number;
    limit?: string | number;
    role?: string;
    userId?: number;
  }) {
    const { q, page, limit } = validateInput(eventQuerySchema, {
      q: params.q,
      page: params.page,
      limit: params.limit,
    });
    const { role } = params;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];

    // Admin sees all events; non-admins see all public statuses (published, sold_out, completed, cancelled)
    if (role === 'admin') {
      // No status filter for admins - they see everything
    } else {
      // Exclude only draft status - all other statuses are public
      conditions.push(sql`${events.status} != 'draft'`);
    }

    if (q) {
      conditions.push(ilike(events.title, `%${q}%`));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matching events
    const [{ total }] = await db.select({ total: count() }).from(events).where(whereClause);

    // Query events with seat aggregation
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        venue: events.venue,
        eventDate: events.eventDate,
        bannerImageUrl: events.bannerImageUrl,
        minAge: events.minAge,
        maxTicketsPerUser: events.maxTicketsPerUser,
        status: events.status,
        minPrice: min(seatSections.price),
        totalSeats: count(sql`CASE WHEN ${seats.status} != 'disabled' THEN 1 END`),
        availableSeats: count(sql`CASE WHEN ${seats.status} = 'available' THEN 1 END`),
      })
      .from(events)
      .leftJoin(seatSections, eq(seatSections.eventId, events.id))
      .leftJoin(seats, eq(seats.sectionId, seatSections.id))
      .where(whereClause)
      .groupBy(events.id)
      .orderBy(events.eventDate)
      .limit(limit)
      .offset(offset);

    return {
      events: rows.map((r) => ({
        id: r.id,
        title: r.title,
        venue: r.venue,
        event_date: r.eventDate,
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

    // 1. Get event basic info
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);

    if (!event) throwError(Errors.NOT_FOUND);

    // Draft events are only visible to the admin who created them
    // Other statuses (published, sold_out, completed, cancelled) are public
    if (event.status === 'draft') {
      if (role !== 'admin' || event.createdBy !== userId) {
        throwError(Errors.NOT_FOUND);
      }
    }

    // 2. Get sections ordered by sort_order
    const sections = await db
      .select()
      .from(seatSections)
      .where(eq(seatSections.eventId, eventId))
      .orderBy(seatSections.sortOrder);

    // 3. Aggregate seat counts per section in a single query (avoid N+1)
    const seatCounts = await db
      .select({
        sectionId: seats.sectionId,
        seatCount: count(),
        availableCount: count(sql`CASE WHEN ${seats.status} = 'available' THEN 1 END`),
        disabledCount: count(sql`CASE WHEN ${seats.status} = 'disabled' THEN 1 END`),
      })
      .from(seats)
      .where(eq(seats.eventId, eventId))
      .groupBy(seats.sectionId);

    // 4. Build a map for O(1) lookup
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

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      event_date: event.eventDate,
      banner_image_url: event.bannerImageUrl,
      status: event.status,
      sections: sections.map((s) => {
        const counts = countsMap.get(s.id) || {
          seat_count: 0,
          available_count: 0,
          disabled_count: 0,
        };
        return {
          id: s.id,
          name: s.name,
          type: s.type,
          prefix: s.prefix,
          is_seat_pickable: s.isSeatPickable,
          price: Number(s.price),
          rows: s.rows,
          cols: s.cols,
          layout_x: s.layoutX,
          layout_y: s.layoutY,
          start_row_index: s.startRowIndex,
          start_col_index: s.startColIndex,
          seat_count: counts.seat_count,
          available_count: counts.available_count,
          disabled_count: counts.disabled_count,
        };
      }),
    };
  },

  async createEvent(adminId: number, data: unknown) {
    const { sections, ...eventData } = validateInput(createEventSchema, data);
    validateEventRequirements(sections);

    return await db.transaction(async (tx) => {
      const [newEvent] = await tx
        .insert(events)
        .values({
          title: eventData.title,
          description: eventData.description,
          venue: eventData.venue,
          eventDate: new Date(eventData.event_date),
          bannerImageUrl: eventData.banner_image_url || null,
          minAge: eventData.min_age ?? 0,
          maxTicketsPerUser: eventData.max_tickets_per_user ?? 0,
          stageLayout: eventData.stage_layout ?? [],
          createdBy: adminId,
          status: 'draft',
        })
        .returning();

      const { total_seats, total_available_seats, sectionsInfo } = await insertSectionsWithSeats(
        tx,
        newEvent.id,
        sections,
      );

      return {
        id: newEvent.id,
        title: newEvent.title,
        status: newEvent.status,
        total_seats,
        total_available_seats,
        sections: sectionsInfo,
      };
    });
  },

  async updateEventSections(adminId: number, eventId: number, data: unknown) {
    const { sections } = validateInput(updateSectionsSchema, data);
    validateEventRequirements(sections);

    return await db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1)
        .for('update');
      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      if (event.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

      // Must delete seats first due to FK constraint on seatSections
      await tx.delete(seats).where(eq(seats.eventId, eventId));
      await tx.delete(seatSections).where(eq(seatSections.eventId, eventId));

      const { total_seats, total_available_seats, sectionsInfo } = await insertSectionsWithSeats(
        tx,
        event.id,
        sections,
      );

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        total_seats,
        total_available_seats,
        sections: sectionsInfo,
      };
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
      const [hasSeats] = await tx
        .select()
        .from(seats)
        .where(and(eq(seats.eventId, eventId), eq(seats.status, 'available')))
        .limit(1);
      if (!hasSeats) throwError(Errors.NO_SEATS);
      const [updated] = await tx
        .update(events)
        .set({ status: 'published' })
        .where(eq(events.id, eventId))
        .returning();
      return { id: updated.id, status: updated.status };
    });
  },
};
