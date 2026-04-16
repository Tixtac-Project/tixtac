import { db } from '$lib/server/db';
import { orderItems, orders, seats, seatSections } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { and, desc, eq, inArray } from 'drizzle-orm';

/* ================= TYPE ================= */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Order = typeof orders.$inferSelect;

/* ================= HELPER ================= */

async function buildOrderResponse(tx: Tx, orderId: number, paidAt: Date, order: Order) {
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
    // Bắt đầu transaction
    return await db.transaction(async (tx) => {
      const now = new Date();

      // 1. Lấy order và kiểm tra tồn tại
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order) {
        throwError(Errors.NOT_FOUND);
      }

      // 2. Kiểm tra ownership
      if (order.userId !== customerId) {
        throwError(Errors.ORDER_NOT_OWNED);
      }

      // 3. Kiểm tra trạng thái pending
      if (order.status !== 'pending') {
        throwError(Errors.ORDER_NOT_PENDING);
      }

      // 4. Kiểm tra hết hạn giữ chỗ
      if (now >= order.expiresAt) {
        throwError(Errors.LOCK_EXPIRED);
      }

      // 5. Lấy danh sách order items của đơn hàng này
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

      // Kiểm tra đơn hàng có vé không (nếu yêu cầu, có thể bỏ qua)
      if (items.length === 0) {
        throwError(Errors.ORDER_EMPTY);
      }

      const seatIds = items.map((i) => i.seatId);

      // 6. Cập nhật trạng thái các ghế thành 'sold' (chỉ cập nhật những ghế đang bị khóa bởi customer này)
      if (seatIds.length > 0) {
        const updatedSeats = await tx
          .update(seats)
          .set({
            status: 'sold',
            lockedBy: null,
            lockedAt: null,
          })
          .where(
            and(
              inArray(seats.id, seatIds),
              eq(seats.status, 'locked'),
              eq(seats.lockedBy, customerId),
            ),
          )
          .returning({ id: seats.id });

        // Nếu số ghế cập nhật không khớp với số ghế trong order, có nghĩa có ghế đã bị thay đổi trạng thái bất thường
        if (updatedSeats.length !== seatIds.length) {
          throwError(Errors.SEAT_NOT_AVAILABLE);
        }
      }

      // 7. Cập nhật order thành paid
      await tx
        .update(orders)
        .set({
          status: 'paid',
          paidAt: now,
        })
        .where(eq(orders.id, orderId));

      // 8. Xây dựng response
      return await buildOrderResponse(tx, orderId, now, order);
    });
  },

  /**
   * Lấy danh sách toàn bộ vé (orders đã thanh toán) của một User.
   */
  async getMyTickets(userId: number) {
    /**
     * Query database bằng drizzle relational API.
     * Tự động JOIN 6 bảng lại với nhau.
     */
    const rawOrders = await db.query.orders.findMany({
      where: and(eq(orders.userId, userId), eq(orders.status, 'paid')),
      orderBy: [desc(orders.paidAt)],
      with: {
        items: {
          with: {
            seat: {
              with: {
                section: true,
                show: {
                  with: {
                    event: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (rawOrders.length === 0) {
      return [];
    }

    return rawOrders.map((order) => {
      const firstItemSeat = order.items[0]?.seat;
      const showInfo = firstItemSeat?.show;
      const eventInfo = showInfo?.event;

      return {
        order_id: order.id,
        total_amount: Number(order.totalAmount).toFixed(2),
        paid_at: order.paidAt ? order.paidAt.toISOString() : null,

        event: eventInfo
          ? {
              id: eventInfo.id,
              title: eventInfo.title,
              venue: eventInfo.venue,
              banner_image_url: eventInfo.bannerImageUrl,
            }
          : null,

        show: showInfo
          ? {
              id: showInfo.id,
              title: showInfo.title,
              show_date: showInfo.showDate,
              start_time: showInfo.startTime,
            }
          : null,

        items: order.items.map((item) => ({
          id: item.id,
          ticket_code: item.ticketCode,
          seat_id: item.seatId,
          section_name: item.seat.section.name,
          prefix: item.seat.prefix,
          row_label: item.seat.rowLabel,
          col_number: item.seat.colNumber,
          price_snapshot: Number(item.priceSnapshot).toFixed(2),
          is_checked_in: item.isCheckedIn,
          qr_code: null,
        })),
      };
    });
  },
};
