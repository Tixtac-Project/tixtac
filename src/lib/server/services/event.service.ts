import { db } from '$lib/server/db';
import { events, seatSections, seats } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { type CreateEventInput, type SectionInput } from '$lib/shared/schemas/event.schema';
import { eq } from 'drizzle-orm';

type InsertSeat = typeof seats.$inferInsert;

function getRowLabel(index: number): string {
  let label = '';
  let i = index;

  while (i >= 0) {
    label = String.fromCharCode((i % 26) + 65) + label;
    i = Math.floor(i / 26) - 1;
  }

  return label;
}

function buildSeats(eventId: number, sectionId: number, section: SectionInput): InsertSeat[] {
  const seatBatch: InsertSeat[] = [];

  for (let r = 0; r < section.rows; r++) {
    const rowLabel = getRowLabel(r);

    for (let c = 1; c <= section.cols; c++) {
      seatBatch.push({
        eventId,
        sectionId,
        rowLabel,
        colNumber: c,
        status: 'available',
      });
    }
  }

  return seatBatch;
}

export const eventService = {
  async createEvent(adminId: number, data: CreateEventInput) {
    return await db.transaction(async (tx) => {
      // 1. Insert event
      const [event] = await tx
        .insert(events)
        .values({
          title: data.title,
          description: data.description,
          venue: data.venue,
          eventDate: new Date(data.event_date),
          bannerImageUrl: data.banner_image_url || null,
          status: 'draft',
          createdBy: adminId,
        })
        .returning();

      let totalSeats = 0;
      const createdSections = [];

      const sortedSections = [...data.sections].sort((a, b) => a.sort_order - b.sort_order);

      for (const section of sortedSections) {
        const [sec] = await tx
          .insert(seatSections)
          .values({
            eventId: event.id,
            name: section.name,
            rows: section.rows,
            cols: section.cols,
            price: section.price.toString(),
            sortOrder: section.sort_order,
          })
          .returning();

        const seatBatch = buildSeats(event.id, sec.id, section);

        // chunk insert (avoid overload)
        const chunkSize = 500;
        for (let i = 0; i < seatBatch.length; i += chunkSize) {
          await tx.insert(seats).values(seatBatch.slice(i, i + chunkSize));
        }

        const seatCount = section.rows * section.cols;
        totalSeats += seatCount;

        createdSections.push({
          id: sec.id,
          name: sec.name,
          rows: sec.rows,
          cols: sec.cols,
          price: sec.price,
          seat_count: seatCount,
        });
      }

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        total_seats: totalSeats,
        sections: createdSections,
      };
    });
  },

  async publishEvent(eventId: number) {
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      throwError(Errors.NOT_FOUND);
    }

    if (event.status === 'published') {
      throwError(Errors.ALREADY_PUBLISHED);
    }

    const [updated] = await db
      .update(events)
      .set({ status: 'published' })
      .where(eq(events.id, eventId))
      .returning();

    return {
      id: updated.id,
      status: updated.status,
    };
  },
};
