import { db } from '$lib/server/db';
import { events, seatSections, seats } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { createEventSchema, updateSectionsSchema, type SectionInput } from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { getRowLabel } from '$lib/utils/seat-label';
import { and, eq, type InferInsertModel } from 'drizzle-orm';
import { validateEventRequirements } from '../validators/seat-overlap.validator';
const BATCH_SIZE = 1000;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function generateAndInsertSeats(
  tx: DbTransaction,
  eventId: number,
  sectionId: number,
  section: SectionInput,
) {
  const startRow = section.start_row_index ?? 0;
  const startCol = section.start_col_index ?? 1;
  const disabledSet = new Set(section.disabled_seats ?? []);

  const seatsToInsert: InferInsertModel<typeof seats>[] = [];
  let disabled_count = 0;

  for (let r = 0; r < section.rows; r++) {
    const rowLabel = getRowLabel(startRow + r);
    for (let c = 0; c < section.cols; c++) {
      const colNumber = startCol + c;
      const seatKey = `${rowLabel}${colNumber}`;
      const status: InferInsertModel<typeof seats>['status'] = disabledSet.has(seatKey)
        ? 'disabled'
        : 'available';

      if (status === 'disabled') disabled_count++;

      seatsToInsert.push({
        eventId,
        sectionId,
        rowLabel,
        colNumber,
        status,
      });
    }
  }

  for (let i = 0; i < seatsToInsert.length; i += BATCH_SIZE) {
    await tx.insert(seats).values(seatsToInsert.slice(i, i + BATCH_SIZE));
  }

  const seat_count = section.rows * section.cols;
  const available_count = seat_count - disabled_count;

  return { seat_count, available_count, disabled_count };
}

async function insertSectionsWithSeats(
  tx: DbTransaction,
  eventId: number,
  sections: SectionInput[],
) {
  let total_seats = 0;
  let total_available_seats = 0;
  const sectionsInfo = [];

  for (const sec of sections) {
    const [newSection] = await tx
      .insert(seatSections)
      .values({
        eventId,
        name: sec.name,
        rows: sec.rows,
        cols: sec.cols,
        price: String(sec.price),
        layoutX: sec.layout_x,
        layoutY: sec.layout_y,
        startRowIndex: sec.start_row_index,
        startColIndex: sec.start_col_index,
        sortOrder: sec.sort_order,
      })
      .returning();

    const counts = await generateAndInsertSeats(tx, eventId, newSection.id, sec);
    total_seats += counts.seat_count;
    total_available_seats += counts.available_count;
    sectionsInfo.push({
      id: newSection.id,
      name: newSection.name,
      rows: newSection.rows,
      cols: newSection.cols,
      seat_count: counts.seat_count,
      available_count: counts.available_count,
      disabled_count: counts.disabled_count,
    });
  }

  return { total_seats, total_available_seats, sectionsInfo };
}

export const eventService = {
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
