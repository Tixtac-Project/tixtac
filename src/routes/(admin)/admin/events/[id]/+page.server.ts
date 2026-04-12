import { db } from '$lib/server/db';
import { events, seatSections, seats } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const eventId = Number(params.id);
  if (
    Number.isNaN(eventId) ||
    !Number.isFinite(eventId) ||
    !Number.isInteger(eventId) ||
    eventId <= 0
  ) {
    error(404, 'Không tìm thấy sự kiện');
  }

  // 1. Get event
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) error(404, 'Không tìm thấy sự kiện');

  // 2. Get sections ordered by sort_order
  const sections = await db
    .select()
    .from(seatSections)
    .where(eq(seatSections.eventId, eventId))
    .orderBy(seatSections.sortOrder);

  // 3. Get all seats for this event
  const allSeats = await db
    .select({
      id: seats.id,
      sectionId: seats.sectionId,
      prefix: seats.prefix,
      rowLabel: seats.rowLabel,
      colNumber: seats.colNumber,
      status: seats.status,
    })
    .from(seats)
    .where(eq(seats.eventId, eventId));

  // 4. Group seats by section
  const seatsBySection = new Map<number, typeof allSeats>();
  for (const seat of allSeats) {
    const list = seatsBySection.get(seat.sectionId) ?? [];
    list.push(seat);
    seatsBySection.set(seat.sectionId, list);
  }

  // 5. Build response
  const sectionsData = sections.map((s) => {
    const sectionSeats = seatsBySection.get(s.id) ?? [];

    // Count stats (exclude disabled from total)
    let available = 0;
    let locked = 0;
    let sold = 0;
    let disabled = 0;
    for (const seat of sectionSeats) {
      if (seat.status === 'available') available++;
      else if (seat.status === 'locked') locked++;
      else if (seat.status === 'sold') sold++;
      else if (seat.status === 'disabled') disabled++;
    }
    const totalActive = available + locked + sold;

    // Build seat grid: map of "rowLabel" -> map of colNumber -> status (including disabled)
    const seatGrid: Record<string, Record<number, { status: string; label: string }>> = {};
    for (const seat of sectionSeats) {
      if (!seatGrid[seat.rowLabel]) seatGrid[seat.rowLabel] = {};
      seatGrid[seat.rowLabel][seat.colNumber] = {
        status: seat.status,
        label: `${seat.prefix}-${seat.rowLabel}${seat.colNumber}`,
      };
    }

    return {
      id: s.id,
      name: s.name,
      prefix: s.prefix,
      price: Number(s.price),
      rows: s.rows,
      cols: s.cols,
      layoutX: s.layoutX,
      layoutY: s.layoutY,
      startRowIndex: s.startRowIndex,
      startColIndex: s.startColIndex,
      stats: { total: totalActive, available, locked, sold, disabled },
      seatGrid,
    };
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      eventDate: event.eventDate.toISOString(),
      bannerImageUrl: event.bannerImageUrl,
      status: event.status,
    },
    sections: sectionsData,
  };
};
