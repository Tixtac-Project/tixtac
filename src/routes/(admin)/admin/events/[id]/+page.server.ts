import { db } from '$lib/server/db';
import {
  categories,
  events,
  eventShows,
  seats,
  seatSections,
  type SectionLayoutConfig,
  type SectionSeatConfig,
} from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const eventId = Number(params.id);
  if (
    Number.isNaN(eventId) ||
    !Number.isFinite(eventId) ||
    !Number.isInteger(eventId) ||
    eventId <= 0
  ) {
    error(404, 'Không tìm thấy sự kiện');
  }

  // 1. Get event with category info
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
    })
    .from(events)
    .leftJoin(categories, eq(categories.id, events.categoryId))
    .where(eq(events.id, eventId))
    .limit(1);
  if (!eventRow) error(404, 'Không tìm thấy sự kiện');
  const event = eventRow;

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

  // 4. Get all seats across all shows
  let allSeats: {
    id: number;
    sectionId: number;
    showId: number;
    prefix: string;
    rowLabel: string;
    colNumber: number;
    status: string;
  }[] = [];
  if (showIds.length > 0) {
    allSeats = await db
      .select({
        id: seats.id,
        sectionId: seats.sectionId,
        showId: seats.showId,
        prefix: seats.prefix,
        rowLabel: seats.rowLabel,
        colNumber: seats.colNumber,
        status: seats.status,
      })
      .from(seats)
      .where(
        sql`${seats.showId} IN (${sql.join(
          showIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
  }

  // 5. Group seats by section
  const seatsBySection = new Map<number, typeof allSeats>();
  for (const seat of allSeats) {
    const list = seatsBySection.get(seat.sectionId) ?? [];
    list.push(seat);
    seatsBySection.set(seat.sectionId, list);
  }

  // 6. Group sections by showId
  const sectionsByShow = new Map<number, (typeof seatSections.$inferSelect)[]>();
  for (const s of allSections) {
    const arr = sectionsByShow.get(s.showId) ?? [];
    arr.push(s);
    sectionsByShow.set(s.showId, arr);
  }

  // ── Default JSONB fallbacks ──
  const defaultLayout: SectionLayoutConfig = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    color: '#cccccc',
  };
  const defaultSeatCfg: SectionSeatConfig = {
    rows: 0,
    cols: 0,
    prefix: null,
    rowFormat: 'alphabetic',
    colDirection: 'ltr',
    startRowIndex: 1,
    startColIndex: 1,
  };

  // 7. Build response with show-based hierarchy
  // Returns SeatMapSection-compatible shape (snake_case) so the SeatMap
  // component can consume it directly without client-side conversion.
  function buildSectionData(s: typeof seatSections.$inferSelect) {
    const sectionSeats = seatsBySection.get(s.id) ?? [];
    const layout = (s.layoutConfig ?? defaultLayout) as SectionLayoutConfig;
    const seatCfg = (s.seatConfig ?? defaultSeatCfg) as SectionSeatConfig;

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

    // Build seat grid for SectionDetail component
    const seatGrid: Record<string, Record<number, { status: string; label: string }>> = {};
    for (const seat of sectionSeats) {
      if (!seatGrid[seat.rowLabel]) seatGrid[seat.rowLabel] = {};
      const prefixStr = seat.prefix ? `${seat.prefix}-` : '';
      seatGrid[seat.rowLabel][seat.colNumber] = {
        status: seat.status,
        label: `${prefixStr}${seat.rowLabel}${seat.colNumber}`,
      };
    }

    return {
      id: s.id,
      name: s.name,
      type: s.type,
      price: String(Number(s.price)),
      capacity: s.capacity,
      sort_order: s.sortOrder,
      layout_config: {
        x: layout.x ?? 0,
        y: layout.y ?? 0,
        width: layout.width ?? 100,
        height: layout.height ?? 100,
        rotation: layout.rotation ?? 0,
        color: layout.color ?? '#cccccc',
      },
      seat_config: {
        rows: s.type === 'general' ? 0 : (seatCfg.rows ?? 0),
        cols: s.type === 'general' ? 0 : (seatCfg.cols ?? 0),
        prefix: seatCfg.prefix,
        rowFormat: seatCfg.rowFormat ?? 'alphabetic',
        colDirection: seatCfg.colDirection ?? 'ltr',
        startRowIndex: seatCfg.startRowIndex ?? 1,
        startColIndex: seatCfg.startColIndex ?? 1,
      },
      sales_start_at: s.salesStartAt?.toISOString() ?? null,
      sales_end_at: s.salesEndAt?.toISOString() ?? null,
      seats: sectionSeats.map((seat) => ({
        id: seat.id,
        prefix: seat.prefix,
        row_label: s.type === 'general' ? '' : seat.rowLabel,
        col_number: seat.colNumber,
        status: seat.status as 'available' | 'locked' | 'sold' | 'disabled',
      })),
      // Extra fields for admin UI (SectionDetail component)
      stats: { total: totalActive, available, locked, sold, disabled },
      seatGrid,
    };
  }

  const showsData = shows.map((show) => {
    const showSections = sectionsByShow.get(show.id) ?? [];
    const sectionsData = showSections.map(buildSectionData);

    // Aggregate show-level stats
    let totalAvailable = 0;
    let totalLocked = 0;
    let totalSold = 0;
    let totalDisabled = 0;
    let totalSeats = 0;
    for (const sec of sectionsData) {
      totalAvailable += sec.stats.available;
      totalLocked += sec.stats.locked;
      totalSold += sec.stats.sold;
      totalDisabled += sec.stats.disabled;
      totalSeats += sec.stats.total + sec.stats.disabled;
    }

    return {
      id: show.id,
      title: show.title,
      showDate: show.showDate,
      startTime: show.startTime.toISOString(),
      endTime: show.endTime?.toISOString() ?? null,
      itinerary: show.itinerary as { time: string; activity: string; description: string }[],
      status: show.status,
      sections: sectionsData,
      stats: {
        total: totalSeats,
        available: totalAvailable,
        locked: totalLocked,
        sold: totalSold,
        disabled: totalDisabled,
      },
    };
  });

  return {
    event: {
      id: event.id,
      categoryId: event.categoryId,
      categoryName: event.categoryName,
      categorySlug: event.categorySlug,
      title: event.title,
      description: event.description,
      termsAndConditions: event.termsAndConditions,
      venue: event.venue,
      bannerImageUrl: event.bannerImageUrl,
      staticMapImageUrl: event.staticMapImageUrl,
      minAge: event.minAge,
      maxTicketsPerUser: event.maxTicketsPerUser,
      mapConfig: event.mapConfig,
      stageLayout: event.stageLayout,
      amenities: event.amenities,
      organizerInfo: event.organizerInfo as Record<string, string> | null,
      status: event.status,
    },
    shows: showsData,
  };
};
