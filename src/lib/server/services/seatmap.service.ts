import { db } from '$lib/server/db';
import { events, eventShows, seats, seatSections } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { addSeatmapSchema, updateShowSectionsSchema, type SectionInput } from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import type { DbTransaction } from '$lib/types/db';
import { getRowLabel } from '$lib/utils/seat-label';
import { eq, type InferInsertModel } from 'drizzle-orm';
import { validateEventRequirements } from '../validators/seat-overlap.validator';

/**
 * Max seats per INSERT statement.
 * Each seat row has ~7 columns → ~7 params. PG max params = 65535 → ~9k rows.
 * We use 5000 as a safe, performant batch size.
 */
export const SEAT_INSERT_BATCH_SIZE = 5000;

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
export async function insertSectionsWithSeats(
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

    // For GA sections, generate virtual placeholder seats (one per capacity unit)
    // so the hold → checkout flow works identically for both types.
    if (sectionType === 'general') {
      const gaCapacity = sec.capacity ?? 0;
      const gaPrefix = seatCfg.prefix || 'GA';

      for (let i = 1; i <= gaCapacity; i++) {
        allSeats.push({
          showId,
          sectionId: dbSection.id,
          prefix: gaPrefix,
          rowLabel: '1',
          colNumber: i,
          status: 'available',
        });
      }

      total_seats += gaCapacity;
      total_available_seats += gaCapacity;

      sectionsInfo.push({
        id: dbSection.id,
        name: dbSection.name,
        type: sectionType,
        capacity: gaCapacity,
        seat_count: gaCapacity,
        available_count: gaCapacity,
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
        const rowColSep = seatCfg.rowFormat === 'numeric' ? '-' : '';
        const seatKey = `${prefixStr}${rowLabel}${rowColSep}${colNumber}`;
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

  // ── 4. Sync materialized counters on each section ──
  for (let idx = 0; idx < sections.length; idx++) {
    const sec = sections[idx];
    const dbSection = insertedSections[idx];
    const sectionType = sec.type ?? 'assigned';

    if (sectionType === 'general') {
      const gaCapacity = sec.capacity ?? 0;
      await tx
        .update(seatSections)
        .set({ totalSeats: gaCapacity, availableSeats: gaCapacity, disabledSeats: 0 })
        .where(eq(seatSections.id, dbSection.id));
    } else {
      const seatCfg = sec.seat_config;
      const totalCount = seatCfg.rows * seatCfg.cols;
      const sectionSeats = allSeats.filter((s) => s.sectionId === dbSection.id);
      const disabledCount = sectionSeats.filter((s) => s.status === 'disabled').length;
      const availableCount = totalCount - disabledCount;

      await tx
        .update(seatSections)
        .set({
          totalSeats: totalCount,
          availableSeats: availableCount,
          disabledSeats: disabledCount,
        })
        .where(eq(seatSections.id, dbSection.id));
    }
  }

  return { total_seats, total_available_seats, sectionsInfo };
}

/**
 * Insert a show and its sections+seats within a transaction.
 */
export async function insertShowWithSections(
  tx: DbTransaction,
  eventId: number,
  show: {
    title?: string | null;
    show_date: string;
    start_time: string;
    end_time?: string | null;
    itinerary?: unknown[];
    sections: SectionInput[];
  },
) {
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

// ══════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════

export const seatmapService = {
  /**
   * Step 3: Add seatmap (sections + seats) to a specific show.
   * POST /api/events/create/seatmap
   */
  async addSeatmap(adminId: number, data: unknown) {
    const { show_id, sections, map_config, stage_layout } = validateInput(addSeatmapSchema, data);
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

      // Persist map_config / stage_layout on the parent event if provided
      const eventUpdates: Record<string, unknown> = {};
      if (map_config !== undefined) eventUpdates.mapConfig = map_config;
      if (stage_layout !== undefined) eventUpdates.stageLayout = stage_layout;
      if (Object.keys(eventUpdates).length > 0) {
        await tx.update(events).set(eventUpdates).where(eq(events.id, event.id));
      }

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
};
