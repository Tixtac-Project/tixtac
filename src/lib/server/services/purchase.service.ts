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
import { generateTicketCode } from '$lib/utils/ticket-code';
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';

import type { DbTransaction } from './seatmap.service';

// ══════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════

export interface GACartItem {
  section_id: number;
  quantity: number;
}

export interface CartItemInput {
  show_id: number;
  assigned_seats: number[];
  general_admission: GACartItem[];
}

export interface PurchaseBody {
  cart_items: CartItemInput[];
}

export interface GAConflictDetail {
  section_id: number;
  requested: number;
  available: number;
}

export interface CartConflictDetail {
  show_id: number;
  unavailable_assigned_seats: number[];
  unavailable_ga_sections: GAConflictDetail[];
}

interface LockedSeat {
  id: number;
  price: number;
  showId: number;
  sectionId: number;
}

interface PurchaseResponse {
  order_id: number;
  total_amount: string;
  expires_at: string;
  locked_items: number;
  is_appended: boolean;
}

// ══════════════════════════════════════════════════
// INTERNAL HELPERS
// ══════════════════════════════════════════════════

/**
 * Validate user exists, is active, and is a customer.
 */
async function validateUser(tx: DbTransaction, userId: number) {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
  if (!user) throwError(Errors.UNAUTHORIZED, 'Người dùng không tồn tại.');
  if (user.isActive !== true) throwError(Errors.USER_INACTIVE, 'Tài khoản không hoạt động.');
  if (user.role !== 'customer') throwError(Errors.FORBIDDEN, 'Chỉ khách hàng mới được đặt vé.');
  return user;
}

/**
 * Validate event exists and is published.
 */
async function validateEvent(tx: DbTransaction, eventId: number) {
  const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for('update');
  if (!event) throwError(Errors.NOT_FOUND, 'Sự kiện không tồn tại.');
  if (!['published'].includes(event.status)) {
    throwError(Errors.EVENT_NOT_AVAILABLE, 'Sự kiện chưa mở bán hoặc đã hủy.');
  }
  return event;
}

/**
 * Validate all cart items: check shows belong to event, collect assigned seat IDs,
 * validate GA sections, and collect GA requests.
 */
async function validateCartItems(
  tx: DbTransaction,
  eventId: number,
  cartItems: CartItemInput[],
  now: Date,
) {
  const showIdsInCart = new Set<number>();
  const allAssignedSeatIds: number[] = [];
  const gaRequests: Array<{ showId: number; sectionId: number; quantity: number }> = [];

  for (const item of cartItems) {
    if (showIdsInCart.has(item.show_id)) {
      throwError(Errors.DUPLICATE_SHOW, `Suất diễn ${item.show_id} bị trùng trong giỏ hàng.`);
    }
    showIdsInCart.add(item.show_id);

    const [show] = await tx
      .select()
      .from(eventShows)
      .where(and(eq(eventShows.id, item.show_id), eq(eventShows.eventId, eventId)))
      .for('update');
    if (!show) {
      throwError(Errors.SHOW_NOT_AVAILABLE, `Suất diễn ${item.show_id} không thuộc sự kiện.`);
    }

    allAssignedSeatIds.push(...item.assigned_seats);

    for (const ga of item.general_admission) {
      const [section] = await tx
        .select()
        .from(seatSections)
        .where(and(eq(seatSections.id, ga.section_id), eq(seatSections.showId, item.show_id)))
        .for('update');
      if (!section) {
        throwError(Errors.SECTION_NOT_AVAILABLE, `Khu vực ${ga.section_id} không thuộc suất diễn.`);
      }
      if (section.type !== 'general') {
        throwError(Errors.INVALID_SECTION_TYPE, `Khu vực ${ga.section_id} không phải vé đứng.`);
      }
      if (!section.salesStartAt || now < section.salesStartAt) {
        throwError(
          Errors.SALES_NOT_STARTED,
          `Khu vực ${ga.section_id} chưa được thiết lập thời gian mở bán hoặc chưa đến giờ mở bán.`,
        );
      }
      if (section.salesEndAt && now > section.salesEndAt) {
        throwError(Errors.SALES_ENDED, `Khu vực ${ga.section_id} đã ngừng bán.`);
      }
      gaRequests.push({ showId: item.show_id, sectionId: ga.section_id, quantity: ga.quantity });
    }
  }

  return { allAssignedSeatIds, gaRequests };
}

/**
 * Handle existing pending orders: find active order, collect expired order IDs,
 * and build maps of existing seat/GA ownership.
 */
async function resolveExistingOrders(tx: DbTransaction, userId: number, now: Date) {
  const oldPendingOrders = await tx
    .select({
      id: orders.id,
      expiresAt: orders.expiresAt,
      totalAmount: orders.totalAmount,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, 'pending')))
    .for('update');

  const activeCandidates = oldPendingOrders.filter((o) => o.expiresAt > now);
  if (activeCandidates.length > 1) {
    throwError(Errors.ACTIVE_ORDER_EXISTS);
  }
  const activeOrder = activeCandidates[0] ?? null;
  const expiredOrderIds = oldPendingOrders.filter((o) => o.expiresAt <= now).map((o) => o.id);

  // Fetch details of current active order items
  const existingSeatIds = new Set<number>();
  const existingGaCountBySection = new Map<number, number>();
  let existingSeatsDetails: Array<{
    seatId: number;
    sectionId: number;
    sectionType: string;
  }> = [];

  if (activeOrder) {
    existingSeatsDetails = await tx
      .select({
        seatId: orderItems.seatId,
        sectionId: seats.sectionId,
        sectionType: seatSections.type,
      })
      .from(orderItems)
      .innerJoin(seats, eq(seats.id, orderItems.seatId))
      .innerJoin(seatSections, eq(seatSections.id, seats.sectionId))
      .where(eq(orderItems.orderId, activeOrder.id));

    for (const s of existingSeatsDetails) {
      existingSeatIds.add(s.seatId);
      if (s.sectionType === 'general') {
        existingGaCountBySection.set(
          s.sectionId,
          (existingGaCountBySection.get(s.sectionId) || 0) + 1,
        );
      }
    }
  }

  return {
    activeOrder,
    expiredOrderIds,
    existingSeatIds,
    existingGaCountBySection,
    existingSeatsDetails,
  };
}

/**
 * Clean up expired orders: release seats, restore GA capacity, mark as cancelled.
 */
async function cleanupExpiredOrders(tx: DbTransaction, expiredOrderIds: number[]) {
  if (expiredOrderIds.length === 0) return;

  const expiredSeatsData = await tx
    .select({
      seatId: orderItems.seatId,
      sectionId: seats.sectionId,
      sectionType: seatSections.type,
    })
    .from(orderItems)
    .innerJoin(seats, eq(seats.id, orderItems.seatId))
    .innerJoin(seatSections, eq(seatSections.id, seats.sectionId))
    .where(inArray(orderItems.orderId, expiredOrderIds));

  const expiredSeatIds = expiredSeatsData.map((s) => s.seatId);

  if (expiredSeatIds.length > 0) {
    await tx
      .update(seats)
      .set({ status: 'available', lockedBy: null, lockedAt: null })
      .where(inArray(seats.id, expiredSeatIds));
  }

  // Restore GA capacity
  const gaReleasedMap = new Map<number, number>();
  for (const s of expiredSeatsData) {
    if (s.sectionType === 'general') {
      gaReleasedMap.set(s.sectionId, (gaReleasedMap.get(s.sectionId) || 0) + 1);
    }
  }
  for (const [sectionId, qty] of gaReleasedMap.entries()) {
    await tx
      .update(seatSections)
      .set({ capacity: sql`${seatSections.capacity} + ${qty}` })
      .where(eq(seatSections.id, sectionId));
  }

  await tx.update(orders).set({ status: 'cancelled' }).where(inArray(orders.id, expiredOrderIds));
}

/**
 * Cart replacement: remove items from active order that are no longer in the incoming cart.
 */
async function handleCartReplacement(
  tx: DbTransaction,
  activeOrder: { id: number; expiresAt: Date; totalAmount: string },
  allAssignedSeatIds: number[],
  gaRequests: Array<{ showId: number; sectionId: number; quantity: number }>,
  existingSeatIds: Set<number>,
  existingGaCountBySection: Map<number, number>,
  existingSeatsDetails: Array<{ seatId: number; sectionId: number; sectionType: string }>,
) {
  // Assigned seats to remove
  const incomingAssignedSet = new Set(allAssignedSeatIds);
  const assignedToRemove: number[] = [];
  for (const seatId of existingSeatIds) {
    const detail = existingSeatsDetails.find((d) => d.seatId === seatId);
    if (detail?.sectionType === 'assigned' && !incomingAssignedSet.has(seatId)) {
      assignedToRemove.push(seatId);
    }
  }

  // GA reductions
  const incomingGaMap = new Map<number, number>();
  for (const ga of gaRequests) {
    incomingGaMap.set(ga.sectionId, (incomingGaMap.get(ga.sectionId) || 0) + ga.quantity);
  }

  const gaReductions: Array<{ sectionId: number; removeCount: number }> = [];
  for (const [sectionId, existingQty] of existingGaCountBySection.entries()) {
    const incomingQty = incomingGaMap.get(sectionId) || 0;
    if (existingQty > incomingQty) {
      gaReductions.push({ sectionId, removeCount: existingQty - incomingQty });
    }
  }

  // Execute removals
  if (assignedToRemove.length > 0 || gaReductions.length > 0) {
    const gaSeatIdsToRemove: number[] = [];
    for (const red of gaReductions) {
      const seatsToDel = await tx
        .select({ seatId: orderItems.seatId })
        .from(orderItems)
        .innerJoin(seats, eq(seats.id, orderItems.seatId))
        .where(and(eq(orderItems.orderId, activeOrder.id), eq(seats.sectionId, red.sectionId)))
        .limit(red.removeCount);
      gaSeatIdsToRemove.push(...seatsToDel.map((s) => s.seatId));
    }

    const allSeatIdsToRemove = [...assignedToRemove, ...gaSeatIdsToRemove];

    // Delete orderItems
    await tx
      .delete(orderItems)
      .where(
        and(eq(orderItems.orderId, activeOrder.id), inArray(orderItems.seatId, allSeatIdsToRemove)),
      );

    // Release seats
    await tx
      .update(seats)
      .set({ status: 'available', lockedBy: null, lockedAt: null })
      .where(inArray(seats.id, allSeatIdsToRemove));

    // Restore GA capacity
    for (const red of gaReductions) {
      await tx
        .update(seatSections)
        .set({ capacity: sql`${seatSections.capacity} + ${red.removeCount}` })
        .where(eq(seatSections.id, red.sectionId));
    }

    // Update local maps
    allSeatIdsToRemove.forEach((id) => existingSeatIds.delete(id));
    for (const red of gaReductions) {
      const current = existingGaCountBySection.get(red.sectionId) || 0;
      const newCount = current - red.removeCount;
      if (newCount <= 0) {
        existingGaCountBySection.delete(red.sectionId);
      } else {
        existingGaCountBySection.set(red.sectionId, newCount);
      }
    }
  }
}

/**
 * Lock new assigned + GA seats atomically, returning locked seats and any conflicts.
 */
async function lockSeats(
  tx: DbTransaction,
  userId: number,
  cartItems: CartItemInput[],
  gaRequests: Array<{ showId: number; sectionId: number; quantity: number }>,
  existingSeatIds: Set<number>,
  existingGaCountBySection: Map<number, number>,
  now: Date,
) {
  const lockedSeats: LockedSeat[] = [];
  const conflicts: CartConflictDetail[] = [];

  for (const item of cartItems) {
    const conflict: CartConflictDetail = {
      show_id: item.show_id,
      unavailable_assigned_seats: [],
      unavailable_ga_sections: [],
    };

    // Lock assigned seats
    const newAssignedForItem = item.assigned_seats.filter((id) => !existingSeatIds.has(id));
    if (newAssignedForItem.length > 0) {
      const seatRows = await tx
        .select({
          id: seats.id,
          status: seats.status,
          lockedBy: seats.lockedBy,
          lockedAt: seats.lockedAt,
          price: seatSections.price,
          showId: seats.showId,
          sectionId: seats.sectionId,
          sectionType: seatSections.type,
          salesStart: seatSections.salesStartAt,
          salesEnd: seatSections.salesEndAt,
        })
        .from(seats)
        .innerJoin(seatSections, eq(seats.sectionId, seatSections.id))
        .where(and(inArray(seats.id, item.assigned_seats), eq(seats.showId, item.show_id)))
        .orderBy(asc(seats.id))
        .for('update');

      const foundIds = seatRows.map((r) => r.id);
      const missing = item.assigned_seats.filter((id) => !foundIds.includes(id));
      if (missing.length > 0) {
        conflict.unavailable_assigned_seats.push(...missing);
      } else {
        for (const seat of seatRows) {
          if (seat.sectionType !== 'assigned') {
            conflict.unavailable_assigned_seats.push(seat.id);
            continue;
          }
          if (!seat.salesStart || now < seat.salesStart) {
            conflict.unavailable_assigned_seats.push(seat.id);
            continue;
          }
          if (seat.salesEnd && now > seat.salesEnd) {
            conflict.unavailable_assigned_seats.push(seat.id);
            continue;
          }
          if (seat.status === 'available') {
            lockedSeats.push({
              id: seat.id,
              price: Number(seat.price),
              showId: seat.showId,
              sectionId: seat.sectionId,
            });
          } else if (seat.status === 'locked') {
            const lockedAtMs = seat.lockedAt?.getTime();
            const lockExpiry = lockedAtMs ? new Date(lockedAtMs + 10 * 60 * 1000) : null;
            if (seat.lockedBy === userId && lockExpiry && lockExpiry > now) {
              if (!existingSeatIds.has(seat.id)) {
                lockedSeats.push({
                  id: seat.id,
                  price: Number(seat.price),
                  showId: seat.showId,
                  sectionId: seat.sectionId,
                });
              }
            } else {
              conflict.unavailable_assigned_seats.push(seat.id);
            }
          } else {
            conflict.unavailable_assigned_seats.push(seat.id);
          }
        }
      }
    }

    // Lock GA seats using FOR UPDATE SKIP LOCKED
    for (const ga of item.general_admission) {
      const existingQty = existingGaCountBySection.get(ga.section_id) || 0;
      const neededQty = Math.max(0, ga.quantity - existingQty);
      if (neededQty === 0) continue;

      const lockedGaSeats = await tx
        .select({
          id: seats.id,
          price: seatSections.price,
          showId: seats.showId,
          sectionId: seats.sectionId,
        })
        .from(seats)
        .innerJoin(seatSections, eq(seats.sectionId, seatSections.id))
        .where(
          and(
            eq(seats.sectionId, ga.section_id),
            eq(seats.showId, item.show_id),
            eq(seatSections.type, 'general'),
            eq(seats.status, 'available'),
            isNotNull(seatSections.salesStartAt),
            lte(seatSections.salesStartAt, now),
            or(isNull(seatSections.salesEndAt), gte(seatSections.salesEndAt, now)),
          ),
        )
        .limit(neededQty)
        .for('update', { skipLocked: true });

      if (lockedGaSeats.length < neededQty) {
        const availableNow = existingQty + lockedGaSeats.length;
        conflict.unavailable_ga_sections.push({
          section_id: ga.section_id,
          requested: ga.quantity,
          available: availableNow,
        });
      } else {
        lockedSeats.push(
          ...lockedGaSeats.map((s) => ({
            id: s.id,
            price: Number(s.price),
            showId: s.showId,
            sectionId: s.sectionId,
          })),
        );
      }
    }

    if (
      conflict.unavailable_assigned_seats.length > 0 ||
      conflict.unavailable_ga_sections.length > 0
    ) {
      conflicts.push(conflict);
    }
  }

  return { lockedSeats, conflicts };
}

/**
 * Deduct GA capacity for newly locked GA seats.
 */
async function deductGACapacity(
  tx: DbTransaction,
  lockedSeats: LockedSeat[],
  gaRequests: Array<{ showId: number; sectionId: number; quantity: number }>,
) {
  const gaSectionIds = new Set<number>(gaRequests.map((g) => g.sectionId));
  if (gaSectionIds.size > 0) {
    await tx
      .select()
      .from(seatSections)
      .where(inArray(seatSections.id, [...gaSectionIds]))
      .for('update');
  }

  const deductionMap = new Map<number, number>();
  for (const seat of lockedSeats) {
    if (!gaSectionIds.has(seat.sectionId)) continue;
    deductionMap.set(seat.sectionId, (deductionMap.get(seat.sectionId) || 0) + 1);
  }

  for (const [sectionId, qty] of deductionMap.entries()) {
    await tx
      .update(seatSections)
      .set({ capacity: sql`${seatSections.capacity} - ${qty}` })
      .where(eq(seatSections.id, sectionId));
  }
}

/**
 * Create a new order or update the existing active order with newly locked seats.
 */
async function createOrUpdateOrder(
  tx: DbTransaction,
  userId: number,
  activeOrder: { id: number; expiresAt: Date; totalAmount: string } | null,
  lockedSeats: LockedSeat[],
  now: Date,
) {
  const newItemsTotal = lockedSeats.reduce((sum, s) => sum + s.price, 0);
  let finalOrderId: number;
  let finalTotal: number;
  let finalExpiresAt: Date;

  if (activeOrder) {
    // Recalculate total from remaining items + new locked seats
    const existingTotal = await tx
      .select({ total: sql<number>`sum(${orderItems.priceSnapshot})` })
      .from(orderItems)
      .where(eq(orderItems.orderId, activeOrder.id));
    const oldTotal = Number(existingTotal[0]?.total ?? 0);
    finalTotal = oldTotal + newItemsTotal;
    finalExpiresAt = activeOrder.expiresAt;
    await tx
      .update(orders)
      .set({ totalAmount: finalTotal.toString() })
      .where(eq(orders.id, activeOrder.id));
    finalOrderId = activeOrder.id;
  } else {
    finalTotal = newItemsTotal;
    finalExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const [newOrder] = await tx
      .insert(orders)
      .values({
        userId,
        totalAmount: finalTotal.toString(),
        status: 'pending',
        expiresAt: finalExpiresAt,
      })
      .returning({ id: orders.id });
    finalOrderId = newOrder.id;
  }

  // Update seat status and create order items
  if (lockedSeats.length > 0) {
    await tx
      .update(seats)
      .set({ status: 'locked', lockedBy: userId, lockedAt: now })
      .where(
        inArray(
          seats.id,
          lockedSeats.map((s) => s.id),
        ),
      );

    await tx.insert(orderItems).values(
      lockedSeats.map((s) => ({
        orderId: finalOrderId,
        seatId: s.id,
        priceSnapshot: s.price.toString(),
        ticketCode: generateTicketCode(),
      })),
    );
  }

  return { finalOrderId, finalTotal, finalExpiresAt, isAppended: !!activeOrder };
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

    return await db.transaction(async (tx) => {
      // ── Idempotency check ──
      if (idempotencyKey) {
        const [existing] = await tx
          .select()
          .from(idempotencyKeys)
          .where(eq(idempotencyKeys.key, idempotencyKey))
          .for('update');

        if (existing) {
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
        await tx.insert(idempotencyKeys).values({
          key: idempotencyKey,
          status: 'processing',
          createdAt: now,
        });
      }

      // ── 1. Validate user & event ──
      await validateUser(tx, userId);
      const event = await validateEvent(tx, eventId);

      // ── 2. Validate cart items ──
      const { allAssignedSeatIds, gaRequests } = await validateCartItems(
        tx,
        eventId,
        body.cart_items,
        now,
      );

      // ── 3. Resolve existing orders ──
      const {
        activeOrder,
        expiredOrderIds,
        existingSeatIds,
        existingGaCountBySection,
        existingSeatsDetails,
      } = await resolveExistingOrders(tx, userId, now);

      // ── 4. Clean up expired orders ──
      await cleanupExpiredOrders(tx, expiredOrderIds);

      // ── 5. Cart replacement ──
      if (activeOrder) {
        await handleCartReplacement(
          tx,
          activeOrder,
          allAssignedSeatIds,
          gaRequests,
          existingSeatIds,
          existingGaCountBySection,
          existingSeatsDetails,
        );
      }

      // ── 6. Check per-user ticket limit ──
      const userExistingTickets = await tx
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .innerJoin(seats, eq(seats.id, orderItems.seatId))
        .innerJoin(eventShows, eq(eventShows.id, seats.showId))
        .where(
          and(
            eq(orders.userId, userId),
            inArray(orders.status, ['pending', 'paid']),
            eq(eventShows.eventId, eventId),
          ),
        );

      const totalOwned = Number(userExistingTickets[0]?.count ?? 0);

      const newAssignedSeatIds = allAssignedSeatIds.filter((id) => !existingSeatIds.has(id));
      let newGaTotalQty = 0;
      for (const ga of gaRequests) {
        const existingQty = existingGaCountBySection.get(ga.sectionId) || 0;
        newGaTotalQty += Math.max(0, ga.quantity - existingQty);
      }
      const requestedNew = newAssignedSeatIds.length + newGaTotalQty;

      if (event.maxTicketsPerUser > 0 && totalOwned + requestedNew > event.maxTicketsPerUser) {
        throwError(Errors.MAX_TICKETS_EXCEEDED, `Tối đa ${event.maxTicketsPerUser} vé/người.`);
      }

      // ── 7. Check duplicate assigned seats ──
      const uniqueNewAssigned = new Set(newAssignedSeatIds);
      if (uniqueNewAssigned.size !== newAssignedSeatIds.length) {
        throwError(Errors.DUPLICATE_SEAT, 'Có ghế ngồi bị trùng trong giỏ hàng.');
      }

      // ── 8. Lock seats ──
      const { lockedSeats, conflicts } = await lockSeats(
        tx,
        userId,
        body.cart_items,
        gaRequests,
        existingSeatIds,
        existingGaCountBySection,
        now,
      );

      if (conflicts.length > 0) {
        throwError(
          Errors.CART_CONFLICT(),
          'Một số vé không khả dụng.',
          conflicts as unknown as Record<string, string>,
        );
      }

      // ── 9. Deduct GA capacity ──
      await deductGACapacity(tx, lockedSeats, gaRequests);

      // ── 10. Create/update order & order items ──
      const { finalOrderId, finalTotal, finalExpiresAt, isAppended } = await createOrUpdateOrder(
        tx,
        userId,
        activeOrder,
        lockedSeats,
        now,
      );

      // ── 11. Response & idempotency ──
      const responseData: PurchaseResponse = {
        order_id: finalOrderId,
        total_amount: finalTotal.toFixed(2),
        expires_at: finalExpiresAt.toISOString(),
        locked_items: lockedSeats.length,
        is_appended: isAppended,
      };

      if (idempotencyKey) {
        await tx
          .update(idempotencyKeys)
          .set({ status: 'completed', response: responseData })
          .where(eq(idempotencyKeys.key, idempotencyKey));
      }

      return responseData;
    });
  },
};
