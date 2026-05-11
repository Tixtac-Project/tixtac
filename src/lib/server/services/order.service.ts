import { db } from '$lib/server/db';
import { events, eventShows, orderItems, orders, seats, seatSections } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { eventBus, SSE_EVENTS } from '$lib/server/events/event-bus';
import type { PendingOrder } from '$lib/types/purchase';
import { and, desc, eq, gt, inArray, or, sql } from 'drizzle-orm';

/* ================= TYPE ================= */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Order = typeof orders.$inferSelect;

type OrderListRow = {
  orderId: number;
  status: 'pending' | 'paid' | 'cancelled';
  totalAmount: string;
  expiresAt: Date;
  createdAt: Date;
  paidAt: Date | null;
  itemId: number;
  priceSnapshot: string;
  ticketCode: string;
  eventId: number;
  checkinSecret: string;
  showId: number;
  eventTitle: string;
  venue: string;
  bannerImageUrl: string | null;
  showTitle: string | null;
  showDate: string;
  startTime: Date;
  sectionName: string;
  seatType: 'assigned' | 'general';
  prefix: string;
  rowLabel: string;
  colNumber: number;
};

type PaidTicketEntry = {
  event: { id: number; title: string; venue: string; bannerImageUrl: string | null };
  ticket: {
    order_item_id: number;
    show_title: string | null;
    show_date: string;
    start_time: string;
    section_name: string;
    seat_type: 'assigned' | 'general';
    seat_label: string | null;
    ticket_code: string;
    qr_code: null;
    paid_at: string | null;
    event_id: number;
    show_id: number;
    checkin_secret: string;
  };
};

type PaidEventEntry = {
  event_id: number;
  title: string;
  venue: string;
  banner_image_url: string | null;
  tickets: PaidTicketEntry['ticket'][];
};

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
  async getOrderDetails(orderId: number, userId: number) {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
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

    if (!order) {
      throwError(Errors.NOT_FOUND, 'Không tìm thấy đơn hàng.');
    }

    // Format items similar to getMyOrdersAndTickets
    const formattedItems = order.items.map((item) => {
      const seat = item.seat;
      const section = seat.section;
      const isGeneral = section.type === 'general';

      let seatLabel: string | null = null;
      if (!isGeneral) {
        const rowCol = `${seat.rowLabel}${seat.colNumber}`;
        seatLabel = seat.prefix ? `${seat.prefix}-${rowCol}` : rowCol;
      }

      return {
        id: item.id,
        event: {
          id: seat.show.event.id,
          title: seat.show.event.title,
          venue: seat.show.event.venue,
          banner_image_url: seat.show.event.bannerImageUrl,
        },
        show: {
          id: seat.show.id,
          title: seat.show.title,
          show_date: seat.show.showDate,
          start_time: seat.show.startTime.toISOString(),
        },
        section_name: section.name,
        seat_type: section.type,
        seat_label: seatLabel,
        price: Number(item.priceSnapshot).toFixed(2),
      };
    });

    // Group items by event/show for display
    return {
      id: order.id,
      status: order.status,
      total_amount: Number(order.totalAmount).toFixed(2),
      expires_at: order.expiresAt.toISOString(),
      created_at: order.createdAt.toISOString(),
      items: formattedItems,
    };
  },

  async checkout(orderId: number, customerId: number) {
    const txResult = await db.transaction(async (tx) => {
      const now = new Date();

      // 1. Lấy order với FOR UPDATE lock để tránh race condition
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1)
        .for('update');

      if (!order) {
        throwError(Errors.NOT_FOUND);
      }

      // 2. Kiểm tra ownership
      if (order.userId !== customerId) {
        throwError(Errors.ORDER_NOT_OWNED);
      }

      // 3. Kiểm tra trạng thái — trả lại kết quả cũ nếu đã paid (idempotent)
      if (order.status === 'paid') {
        // Fallback to order.updatedAt if paidAt is unexpectedly null
        const effectivePaidAt = order.paidAt ?? order.updatedAt;
        return {
          response: await buildOrderResponse(tx, orderId, effectivePaidAt, order),
          soldSeats: [],
        };
      }

      if (order.status !== 'pending') {
        throwError(Errors.ORDER_NOT_PENDING);
      }

      // 4. Kiểm tra hết hạn giữ chỗ
      if (now >= order.expiresAt) {
        throwError(Errors.LOCK_EXPIRED);
      }

      // 5. Lấy danh sách order items
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

      if (items.length === 0) {
        throwError(Errors.ORDER_EMPTY);
      }

      const seatIds = items.map((i) => i.seatId);

      let soldSeats: { id: number; showId: number }[] = [];

      // 6. Cập nhật trạng thái ghế -> sold (chỉ ghế đang locked bởi customer này)
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
          .returning({ id: seats.id, showId: seats.showId });

        if (updatedSeats.length !== seatIds.length) {
          throwError(Errors.SEAT_NOT_AVAILABLE);
        }
        soldSeats = updatedSeats;

        // locked → sold does not change availableSeats: seats were already removed
        // from the available counter when the order was created.
      }

      // 7. Cập nhật order -> paid
      await tx
        .update(orders)
        .set({
          status: 'paid',
          paidAt: now,
        })
        .where(eq(orders.id, orderId));

      // 8. Xây dựng response
      return {
        response: await buildOrderResponse(tx, orderId, now, order),
        soldSeats,
      };
    });

    // SSE Emit realtime events for sold seats
    try {
      if (txResult.soldSeats && txResult.soldSeats.length > 0) {
        const seatsByShow = txResult.soldSeats.reduce(
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
            status: 'sold',
          });
        }
      }
    } catch (sseErr) {
      console.error('[checkout] SSE emit failed:', sseErr);
    }

    return txResult.response;
  },

  /**
   * Lấy lịch sử mua vé của User (Pending Orders & Paid Events).
   * Uses one explicit projection query instead of Drizzle relational hydration to
   * reduce nested object allocation and avoid selecting unused columns.
   */
  async getMyOrdersAndTickets(userId: number) {
    const now = new Date();

    const rows: OrderListRow[] = await db
      .select({
        orderId: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        expiresAt: orders.expiresAt,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        itemId: orderItems.id,
        priceSnapshot: orderItems.priceSnapshot,
        ticketCode: orderItems.ticketCode,
        checkinSecret: orderItems.checkinSecret,
        showId: orderItems.showId,
        eventId: events.id,
        eventTitle: events.title,
        venue: events.venue,
        bannerImageUrl: events.bannerImageUrl,
        showTitle: eventShows.title,
        showDate: eventShows.showDate,
        startTime: eventShows.startTime,
        sectionName: seatSections.name,
        seatType: seatSections.type,
        prefix: seats.prefix,
        rowLabel: seats.rowLabel,
        colNumber: seats.colNumber,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(events, eq(events.id, orderItems.eventId))
      .innerJoin(eventShows, eq(eventShows.id, orderItems.showId))
      .innerJoin(seats, eq(seats.id, orderItems.seatId))
      .innerJoin(seatSections, eq(seatSections.id, seats.sectionId))
      .where(
        and(
          eq(orders.userId, userId),
          or(
            eq(orders.status, 'paid'),
            and(eq(orders.status, 'pending'), gt(orders.expiresAt, now)),
          ),
        ),
      )
      .orderBy(desc(orders.createdAt), desc(orderItems.id));

    const pendingOrdersMap = new Map<number, PendingOrder>();
    const paidEventsMap = new Map<number, PaidEventEntry>();

    for (const row of rows) {
      const seatLabel =
        row.seatType === 'general'
          ? null
          : row.prefix
            ? `${row.prefix}-${row.rowLabel}${row.colNumber}`
            : `${row.rowLabel}${row.colNumber}`;

      if (row.status === 'pending') {
        let pending = pendingOrdersMap.get(row.orderId);
        if (!pending) {
          pending = {
            order_id: row.orderId,
            total_amount: Number(row.totalAmount).toFixed(2),
            status: 'pending',
            expires_at: row.expiresAt.toISOString(),
            created_at: row.createdAt.toISOString(),
            items: [],
          };
          pendingOrdersMap.set(row.orderId, pending);
        }

        pending.items.push({
          event_id: row.eventId,
          event_title: row.eventTitle,
          show_title: row.showTitle,
          show_date: row.showDate,
          start_time: row.startTime.toISOString(),
          section_name: row.sectionName,
          seat_type: row.seatType,
          seat_label: seatLabel,
          price: Number(row.priceSnapshot).toFixed(2),
        });
        continue;
      }

      if (row.status === 'paid') {
        let paidEvent = paidEventsMap.get(row.eventId);
        if (!paidEvent) {
          paidEvent = {
            event_id: row.eventId,
            title: row.eventTitle,
            venue: row.venue,
            banner_image_url: row.bannerImageUrl,
            tickets: [],
          };
          paidEventsMap.set(row.eventId, paidEvent);
        }

        paidEvent.tickets.push({
          order_item_id: row.itemId,
          show_title: row.showTitle,
          show_date: row.showDate,
          start_time: row.startTime.toISOString(),
          section_name: row.sectionName,
          seat_type: row.seatType,
          seat_label: seatLabel,
          ticket_code: row.ticketCode,
          qr_code: null,
          paid_at: row.paidAt ? row.paidAt.toISOString() : null,
          event_id: row.eventId,
          show_id: row.showId,
          checkin_secret: row.checkinSecret,
        });
      }
    }

    return {
      pending_orders: Array.from(pendingOrdersMap.values()),
      paid_events: Array.from(paidEventsMap.values()),
    };
  },

  async releaseExpiredOrder(
    orderId: number,
  ): Promise<{ releasedSeats: { id: number; showId: number }[] }> {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');

      if (!order) {
        // Không có đơn hàng → coi như không có gì để giải phóng
        return { releasedSeats: [] };
      }

      if (order.status !== 'pending') {
        // Đã xử lý rồi (paid/cancelled/…) → không làm gì
        return { releasedSeats: [] };
      }

      const now = new Date();
      if (order.expiresAt > now) {
        // Chưa hết hạn → giữ nguyên
        return { releasedSeats: [] };
      }

      const items = await tx
        .select({ seatId: orderItems.seatId })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      if (items.length === 0) {
        // Không có items vẫn cần hủy order để đồng bộ trạng thái
        await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));
        return { releasedSeats: [] };
      }

      const seatIds = items.map((i) => i.seatId);

      // Chỉ release ghế đang thật sự locked bởi chính user của đơn này.
      // Also return sectionId so we can restore materialized counters.
      const released = await tx
        .update(seats)
        .set({ status: 'available', lockedBy: null, lockedAt: null })
        .where(
          and(
            inArray(seats.id, seatIds),
            eq(seats.status, 'locked'),
            eq(seats.lockedBy, order.userId),
          ),
        )
        .returning({ id: seats.id, showId: seats.showId, sectionId: seats.sectionId });

      // Restore availableSeats counters for each affected section
      const releaseSectionDelta = new Map<number, number>();
      for (const row of released) {
        releaseSectionDelta.set(row.sectionId, (releaseSectionDelta.get(row.sectionId) ?? 0) + 1);
      }
      for (const [sid, delta] of releaseSectionDelta) {
        await tx
          .update(seatSections)
          .set({ availableSeats: sql`${seatSections.availableSeats} + ${delta}` })
          .where(eq(seatSections.id, sid));
      }

      // Hủy đơn hàng
      await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));

      return { releasedSeats: released };
    });
  },
};
