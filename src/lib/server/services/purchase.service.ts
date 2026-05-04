import { config } from '$lib/server/config';
import { db } from '$lib/server/db';
import {
  events,
  eventShows,
  idempotencyKeys,
  orderItems,
  orders,
  seats,
  seatSections,
  users,
} from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { eventBus, SSE_EVENTS } from '$lib/server/events/event-bus';
import { publishOrderTimeout } from '$lib/server/mq/publisher';
import { orderService } from '$lib/server/services/order.service';
import type { DbTransaction } from '$lib/types/db';
import type { PurchaseBody, PurchaseResponse } from '$lib/types/purchase';
import { generateTicketCode } from '$lib/utils/ticket-code';
import { createHash } from 'node:crypto';
import { and, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';

// ══════════════════════════════════════════════════
// INTERNAL HELPERS
// ══════════════════════════════════════════════════

async function validateUser(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throwError(Errors.UNAUTHORIZED, 'Người dùng không tồn tại.');
  if (user.isActive !== true) throwError(Errors.USER_INACTIVE, 'Tài khoản không hoạt động.');
  if (user.role !== 'customer') throwError(Errors.FORBIDDEN, 'Chỉ khách hàng mới được đặt vé.');
  return user;
}

async function validateEvent(eventId: number) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) throwError(Errors.NOT_FOUND, 'Sự kiện không tồn tại.');
  if (event.status !== 'published') {
    throwError(Errors.EVENT_NOT_AVAILABLE, 'Sự kiện chưa mở bán hoặc đã hủy.');
  }
  return event;
}

async function processAssignedSeats(
  tx: DbTransaction,
  assignedSeatRequests: { showId: number; seatId: number }[],
  now: Date,
) {
  if (assignedSeatRequests.length === 0) return { lockedSeats: [], total: 0 };

  const seatIds = assignedSeatRequests.map((s) => s.seatId);

  // 1. Lock ghế chỉ định (Assigned) - chỉ lấy những ghế 'available'
  const availableAssignedSeats = await tx
    .select({
      id: seats.id,
      price: seatSections.price,
      showId: seats.showId,
    })
    .from(seats)
    .innerJoin(seatSections, eq(seats.sectionId, seatSections.id))
    .where(
      and(
        inArray(seats.id, seatIds),
        eq(seats.status, 'available'),
        eq(seatSections.type, 'assigned'),
        or(isNull(seatSections.salesStartAt), lte(seatSections.salesStartAt, now)),
        or(isNull(seatSections.salesEndAt), gte(seatSections.salesEndAt, now)),
      ),
    )
    .for('update');

  // Nếu số lượng ghế tìm được ít hơn số lượng yêu cầu -> Có ghế bị người khác lấy hoặc không mở bán
  if (availableAssignedSeats.length < seatIds.length) {
    const foundIds = availableAssignedSeats.map((s) => s.id);
    const missingIds = seatIds.filter((id) => !foundIds.includes(id));
    throw Errors.CART_CONFLICT({
      missing_seats: missingIds.join(','),
    });
  }

  // Kiểm tra xem ghế có thuộc đúng show không
  for (const seat of availableAssignedSeats) {
    const request = assignedSeatRequests.find((r) => r.seatId === seat.id);
    if (request && request.showId !== seat.showId) {
      throwError(Errors.CART_CONFLICT(), `Ghế ${seat.id} không thuộc suất diễn ${request.showId}.`);
    }
  }

  let total = 0;
  const lockedSeats = availableAssignedSeats.map((seat) => {
    total += Number(seat.price);
    return { id: seat.id, price: Number(seat.price) };
  });

  return { lockedSeats, total };
}

async function processGaSeats(
  tx: DbTransaction,
  gaRequests: { showId: number; sectionId: number; quantity: number }[],
  now: Date,
) {
  const lockedSeats: { id: number; price: number }[] = [];
  let total = 0;

  // 2. Grab vé GA (Pre-generated rows)
  for (const ga of gaRequests) {
    const availableGaSeats = await tx
      .select({
        id: seats.id,
        price: seatSections.price,
      })
      .from(seats)
      .innerJoin(seatSections, eq(seats.sectionId, seatSections.id))
      .where(
        and(
          eq(seats.sectionId, ga.sectionId),
          eq(seats.showId, ga.showId),
          eq(seats.status, 'available'),
          eq(seatSections.type, 'general'),
          or(isNull(seatSections.salesStartAt), lte(seatSections.salesStartAt, now)),
          or(isNull(seatSections.salesEndAt), gte(seatSections.salesEndAt, now)),
        ),
      )
      .limit(ga.quantity)
      .for('update', { skipLocked: true });

    if (availableGaSeats.length < ga.quantity) {
      throw Errors.CART_CONFLICT({
        missing_ga_section: String(ga.sectionId),
        show_id: String(ga.showId),
      });
    }

    for (const seat of availableGaSeats) {
      lockedSeats.push({ id: seat.id, price: Number(seat.price) });
      total += Number(seat.price);
    }
  }

  return { lockedSeats, total };
}

// ══════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════

export const purchaseService = {
  async purchaseTickets(
    userId: number,
    eventId: number,
    body: PurchaseBody,
    idempotencyKey?: string,
  ): Promise<PurchaseResponse> {
    const now = new Date();
    const payloadHash = createHash('sha256')
      .update(JSON.stringify({ eventId, body }))
      .digest('hex');

    // ══════════════════════════════════════════════════
    // PHASE 1: READ & VALIDATE (NO TRANSACTION)
    // ══════════════════════════════════════════════════

    // 1. Idempotency check
    if (idempotencyKey) {
      const [inserted] = await db
        .insert(idempotencyKeys)
        .values({
          key: idempotencyKey,
          userId,
          payloadHash,
          status: 'processing',
          createdAt: now,
        })
        .onConflictDoNothing({ target: idempotencyKeys.key })
        .returning();

      if (!inserted) {
        const [existing] = await db
          .select()
          .from(idempotencyKeys)
          .where(eq(idempotencyKeys.key, idempotencyKey));

        if (existing) {
          if (existing.userId !== userId) {
            throwError(Errors.FORBIDDEN, 'Khóa idempotency không thuộc về người dùng này.');
          }
          if (existing.payloadHash !== payloadHash) {
            throwError(
              Errors.IDEMPOTENCY_CONFLICT,
              'Khóa idempotency đã được sử dụng với nội dung khác.',
            );
          }
          if (existing.status === 'completed') {
            return existing.response as PurchaseResponse;
          }
          if (existing.status === 'processing') {
            throwError(
              Errors.IDEMPOTENCY_CONFLICT,
              'Yêu cầu đang được xử lý, vui lòng thử lại sau.',
            );
          }
        }
      }
    }

    try {
      // 2. Validate User & Event
      await validateUser(userId);
      const event = await validateEvent(eventId);

      // 3. Get current Cart state & Prepare requests
      const assignedSeatRequests: { showId: number; seatId: number }[] = [];
      const gaRequests: { showId: number; sectionId: number; quantity: number }[] = [];
      const showIdsInCart = new Set<number>();

      for (const item of body.cart_items) {
        if (showIdsInCart.has(item.show_id)) {
          throwError(Errors.DUPLICATE_SHOW, `Suất diễn ${item.show_id} bị trùng trong giỏ hàng.`);
        }
        showIdsInCart.add(item.show_id);

        const [show] = await db
          .select()
          .from(eventShows)
          .where(and(eq(eventShows.id, item.show_id), eq(eventShows.eventId, eventId)));
        if (!show) {
          throwError(Errors.SHOW_NOT_AVAILABLE, `Suất diễn ${item.show_id} không thuộc sự kiện.`);
        }

        for (const seatId of item.assigned_seats) {
          assignedSeatRequests.push({ showId: item.show_id, seatId });
        }

        for (const ga of item.general_admission) {
          if (ga.quantity <= 0) continue;
          // Note: GA section validation is moved to Phase 2 for atomicity
          gaRequests.push({
            showId: item.show_id,
            sectionId: ga.section_id,
            quantity: ga.quantity,
          });
        }
      }

      const uniqueAssigned = new Set(assignedSeatRequests.map((s) => s.seatId));
      if (uniqueAssigned.size !== assignedSeatRequests.length) {
        throwError(Errors.DUPLICATE_SEAT, 'Có ghế ngồi bị trùng trong giỏ hàng.');
      }

      // ══════════════════════════════════════════════════
      // PHASE 2: CRITICAL PATH (SHORT TRANSACTION)
      // ══════════════════════════════════════════════════

      const responseData = await db.transaction(async (tx) => {
        // 1. Check for existing pending orders for this event and user
        const existingOrders = await tx
          .select({ id: orders.id })
          .from(orders)
          .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
          .innerJoin(seats, eq(seats.id, orderItems.seatId))
          .innerJoin(eventShows, eq(eventShows.id, seats.showId))
          .where(
            and(
              eq(orders.userId, userId),
              eq(orders.status, 'pending'),
              eq(eventShows.eventId, eventId),
            ),
          )
          .limit(1)
          .for('update');

        const pendingOrderId: number | null = existingOrders[0]?.id ?? null;

        // If a pending order exists, release its seats
        if (pendingOrderId) {
          const itemsToRelease = await tx
            .select({ seatId: orderItems.seatId })
            .from(orderItems)
            .where(eq(orderItems.orderId, pendingOrderId));

          if (itemsToRelease.length > 0) {
            await tx
              .update(seats)
              .set({ status: 'available', lockedBy: null, lockedAt: null })
              .where(
                inArray(
                  seats.id,
                  itemsToRelease.map((i) => i.seatId),
                ),
              );
          }

          // Clean up old items, we will recreate them or update the order
          await tx.delete(orderItems).where(eq(orderItems.orderId, pendingOrderId));
        }

        // Check per-user ticket limit
        // We count 'paid' tickets + the 'new' requested tickets.
        // The old 'pending' tickets were released above, so they don't count anymore.
        const userExistingTickets = await tx
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

        const totalOwned = Number(userExistingTickets[0]?.count ?? 0);
        const requestedNew =
          assignedSeatRequests.length + gaRequests.reduce((sum, ga) => sum + ga.quantity, 0);

        if (event.maxTicketsPerUser > 0 && totalOwned + requestedNew > event.maxTicketsPerUser) {
          throwError(Errors.MAX_TICKETS_EXCEEDED, `Tối đa ${event.maxTicketsPerUser} vé/người.`);
        }

        // 1. Lock ghế chỉ định (Assigned)
        const { lockedSeats: assignedSeats, total: assignedTotal } = await processAssignedSeats(
          tx,
          assignedSeatRequests,
          now,
        );

        // 2. Grab vé GA (Pre-generated rows)
        const { lockedSeats: gaSeats, total: gaTotal } = await processGaSeats(tx, gaRequests, now);

        const lockedSeatsToProcess = [...assignedSeats, ...gaSeats];
        const calculatedTotal = assignedTotal + gaTotal;

        if (lockedSeatsToProcess.length === 0) {
          throwError(Errors.SEATS_LIST_EMPTY, 'Giỏ hàng trống.');
        }

        // 3. Cập nhật State
        const expiresAt = new Date(now.getTime() + config.seatLockDuration * 1000);

        const lockedSeatRows = await tx
          .update(seats)
          .set({ status: 'locked', lockedBy: userId, lockedAt: now })
          .where(
            inArray(
              seats.id,
              lockedSeatsToProcess.map((s) => s.id),
            ),
          )
          .returning({ id: seats.id, showId: seats.showId });

        let finalOrderId = pendingOrderId;
        if (pendingOrderId) {
          await tx
            .update(orders)
            .set({
              totalAmount: calculatedTotal.toString(),
              expiresAt,
              updatedAt: now,
            })
            .where(eq(orders.id, pendingOrderId));
        } else {
          const [newOrder] = await tx
            .insert(orders)
            .values({
              userId,
              totalAmount: calculatedTotal.toString(),
              status: 'pending',
              expiresAt,
            })
            .returning({ id: orders.id });
          finalOrderId = newOrder.id;
        }

        // PHASE 3: Generate Ticket Codes
        await tx.insert(orderItems).values(
          lockedSeatsToProcess.map((s) => ({
            orderId: finalOrderId!,
            seatId: s.id,
            priceSnapshot: s.price.toString(),
            ticketCode: generateTicketCode(),
          })),
        );

        const finalResponse: PurchaseResponse = {
          order_id: finalOrderId!,
          total_amount: calculatedTotal.toFixed(2),
          expires_at: expiresAt.toISOString(),
          locked_items: lockedSeatsToProcess.length,
          is_appended: !!pendingOrderId,
        };

        if (idempotencyKey) {
          await tx
            .update(idempotencyKeys)
            .set({ status: 'completed', response: finalResponse })
            .where(eq(idempotencyKeys.key, idempotencyKey));
        }

        return {
          ...finalResponse,
          isNewOrder: !pendingOrderId,
          lockedSeatRows,
        };
      });

      // Always (re)publish a timeout message: the consumer's `expiresAt > now`
      // check will drop any earlier stale message after the deadline is extended.
      try {
        await publishOrderTimeout(responseData.order_id);
      } catch (mqErr) {
        console.error('[purchase] publishOrderTimeout failed; rolling back order', mqErr);
        // Compensate: release seats and cancel the order so client can retry.
        await orderService.releaseExpiredOrder(responseData.order_id).catch(() => {});
        throwError(Errors.MQ_UNAVAILABLE, 'Hệ thống tạm thời bận, vui lòng thử lại.');
      }

      // Remove the internal property before returning to the controller
      const { lockedSeatRows, ...finalResponseData } = responseData;

      // SSE: Emit realtime events for locked seats, grouped by showId
      try {
        if (lockedSeatRows && lockedSeatRows.length > 0) {
          const seatsByShow = lockedSeatRows.reduce(
            (acc, curr) => {
              if (!acc[curr.showId]) acc[curr.showId] = [];
              acc[curr.showId].push(curr.id);
              return acc;
            },
            {} as Record<number, number[]>,
          );

          for (const [sId, sIds] of Object.entries(seatsByShow)) {
            const numShowId = Number(sId);
            eventBus.emit(SSE_EVENTS.SEAT_UPDATE(numShowId), {
              showId: numShowId,
              seatIds: sIds,
              status: 'locked',
            });
          }
        }
      } catch (sseErr) {
        console.error('[purchase] SSE emit failed:', sseErr);
      }

      return finalResponseData;
    } catch (error) {
      if (idempotencyKey) {
        await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, idempotencyKey));
      }
      throw error;
    }
  },
};
