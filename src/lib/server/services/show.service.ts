import { db } from '$lib/server/db';
import { events, eventShows, seats, seatSections } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { addShowsSchema, showIdSchema, updateShowSchema } from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { eq, sql } from 'drizzle-orm';

export const showService = {
  /**
   * Step 2: Add shows (sessions) to an existing draft event.
   * POST /api/events/create/shows
   */
  async addShows(adminId: number, data: unknown) {
    const { event_id, shows } = validateInput(addShowsSchema, data);

    return await db.transaction(async (tx) => {
      // Verify event exists, belongs to admin, and is draft (inside tx to prevent TOCTOU)
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.id, event_id))
        .limit(1)
        .for('update');

      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      if (event.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

      // For fresh creation, delete any stale shows first
      const existingShows = await tx
        .select({ id: eventShows.id })
        .from(eventShows)
        .where(eq(eventShows.eventId, event_id));

      if (existingShows.length > 0) {
        const existingShowIds = existingShows.map((s) => s.id);
        await tx.delete(seats).where(
          sql`${seats.showId} IN (${sql.join(
            existingShowIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
        await tx.delete(seatSections).where(
          sql`${seatSections.showId} IN (${sql.join(
            existingShowIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
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
   * Step 2 (Edit): Update shows for an existing draft event.
   * PUT /api/events/create/shows
   * Updates existing shows in-place (preserving sections/seats),
   * inserts new shows, and removes deleted shows.
   */
  async updateShows(adminId: number, data: unknown) {
    const { event_id, shows } = validateInput(addShowsSchema, data);

    return await db.transaction(async (tx) => {
      // Event lookup inside the transaction to prevent TOCTOU race
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.id, event_id))
        .limit(1)
        .for('update');

      if (!event) throwError(Errors.NOT_FOUND);
      if (event.createdBy !== adminId) throwError(Errors.FORBIDDEN);
      if (event.status !== 'draft') throwError(Errors.EVENT_NOT_DRAFT);

      const existingShows = await tx
        .select()
        .from(eventShows)
        .where(eq(eventShows.eventId, event_id))
        .orderBy(eventShows.id);

      const existingShowMap = new Map(existingShows.map((s) => [s.id, s]));

      const resultShows: {
        id: number;
        title: string | null;
        show_date: string;
        start_time: Date;
        end_time: Date | null;
        status: string;
      }[] = [];

      const keptShowIds = new Set<number>();

      for (const show of shows) {
        if (show.id && existingShowMap.has(show.id)) {
          // Update existing show in-place — preserves its sections/seats
          keptShowIds.add(show.id);

          const [updated] = await tx
            .update(eventShows)
            .set({
              title: show.title || null,
              showDate: show.show_date,
              startTime: new Date(show.start_time),
              endTime: show.end_time ? new Date(show.end_time) : null,
              itinerary: show.itinerary ?? [],
            })
            .where(eq(eventShows.id, show.id))
            .returning();

          resultShows.push({
            id: updated.id,
            title: updated.title,
            show_date: updated.showDate,
            start_time: updated.startTime,
            end_time: updated.endTime,
            status: updated.status,
          });
        } else {
          // New show — insert (no id provided, or id not found in existing shows)
          const [inserted] = await tx
            .insert(eventShows)
            .values({
              eventId: event_id,
              title: show.title || null,
              showDate: show.show_date,
              startTime: new Date(show.start_time),
              endTime: show.end_time ? new Date(show.end_time) : null,
              itinerary: show.itinerary ?? [],
              status: 'draft' as const,
            })
            .returning();

          resultShows.push({
            id: inserted.id,
            title: inserted.title,
            show_date: inserted.showDate,
            start_time: inserted.startTime,
            end_time: inserted.endTime,
            status: inserted.status,
          });
        }
      }

      // Delete shows whose id is not in the incoming payload
      const showsToDelete = existingShows.filter((s) => !keptShowIds.has(s.id));
      if (showsToDelete.length > 0) {
        const deleteIds = showsToDelete.map((s) => s.id);
        await tx.delete(seats).where(
          sql`${seats.showId} IN (${sql.join(
            deleteIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
        await tx.delete(seatSections).where(
          sql`${seatSections.showId} IN (${sql.join(
            deleteIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
        await tx.delete(eventShows).where(
          sql`${eventShows.id} IN (${sql.join(
            deleteIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
      }

      return {
        event_id,
        shows: resultShows,
      };
    });
  },

  /**
   * Update a show's metadata (date, time, itinerary).
   * PATCH /api/events/[id]/shows/[showId]
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
};
