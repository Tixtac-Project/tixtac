import { db } from '$lib/server/db';
import { orderItems, orders, seats, seatSections } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { and, eq, inArray } from 'drizzle-orm';

/* ================= TYPE ================= */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/* ================= HELPER ================= */

async function validateOrder(tx: Tx, orderId: number, customerId: number) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  if (!order) throwError(Errors.NOT_FOUND);

  if (order.userId !== customerId) {
    throwError(Errors.ORDER_NOT_OWNED);
  }

  if (order.status !== 'pending') {
    throwError(Errors.ORDER_NOT_PENDING);
  }

  if (new Date() > order.expiresAt) {
    throwError(Errors.LOCK_EXPIRED);
  }

  return order;
}

async function buildOrderResponse(
  tx: Tx,
  orderId: number,
  paidAt: Date,
  order: Awaited<ReturnType<typeof validateOrder>>,
) {
  const detailedItems = await tx
    .select({
      id: orderItems.id,
      seatId: orderItems.seatId,
      ticketCode: orderItems.ticketCode,
      sectionName: seatSections.name,
      prefix: seats.prefix,
      rowLabel: seats.rowLabel,
      colNumber: seats.colNumber,
      priceSnapshot: orderItems.priceSnapshot,
    })
    .from(orderItems)
    .innerJoin(seats, eq(seats.id, orderItems.seatId))
    .innerJoin(seatSections, eq(seatSections.id, seats.sectionId))
    .where(eq(orderItems.orderId, orderId));

  return {
    order_id: order.id,
    status: 'paid',
    total_amount: order.totalAmount,
    paid_at: paidAt.toISOString(),
    items: detailedItems.map((i) => ({
      id: i.id,
      seat_id: i.seatId,
      ticket_code: i.ticketCode,
      section_name: i.sectionName,
      prefix: i.prefix,
      row_label: i.rowLabel,
      col_number: i.colNumber,
      price_snapshot: i.priceSnapshot,
    })),
  };
}

/* ================= SERVICE ================= */

export const orderService = {
  async checkout(orderId: number, customerId: number) {
    return await db.transaction(async (tx) => {
      const order = await validateOrder(tx, orderId, customerId);

      const paidAt = new Date();

      await tx
        .update(orders)
        .set({
          status: 'paid',
          paidAt,
        })
        .where(eq(orders.id, orderId));

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

      if (items.length === 0) {
        throwError(Errors.ORDER_EMPTY);
      }

      const seatIds = items.map((i) => i.seatId);

      if (seatIds.length > 0) {
        await tx
          .update(seats)
          .set({ status: 'sold' })
          .where(and(inArray(seats.id, seatIds), eq(seats.status, 'locked')));
      }

      return await buildOrderResponse(tx, orderId, paidAt, order);
    });
  },
};
