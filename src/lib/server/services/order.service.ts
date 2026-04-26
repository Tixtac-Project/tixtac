import { db } from '$lib/server/db';
import { orderItems, orders, seats, seatSections } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { and, desc, eq, gt, inArray, or } from 'drizzle-orm';

/* ================= TYPE ================= */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Order = typeof orders.$inferSelect;

type OrderItemWithRelations = typeof orderItems.$inferSelect & {
  seat: typeof seats.$inferSelect & {
    section: typeof seatSections.$inferSelect;
    show: {
      title: string | null;
      showDate: string;
      startTime: Date;
      event: {
        id: number;
        title: string;
        venue: string;
        bannerImageUrl: string | null;
      };
    };
  };
};

type FormattedItem = {
  event: { id: number; title: string; venue: string; bannerImageUrl: string | null };
  show: { title: string | null; showDate: string; startTime: Date };
  item_id: number;
  price: string;
  ticket_code: string;
  section_name: string;
  seat_type: 'assigned' | 'general';
  seat_label: string | null;
};

type PendingOrderEntry = {
  order_id: number;
  total_amount: string;
  status: 'pending';
  expires_at: string;
  created_at: string;
  items: {
    event_title: string;
    show_title: string | null;
    show_date: string;
    start_time: string;
    section_name: string;
    seat_type: 'assigned' | 'general';
    seat_label: string | null;
    price: string;
  }[];
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
    return await db.transaction(async (tx) => {
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
        return await buildOrderResponse(tx, orderId, effectivePaidAt, order);
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
          .returning({ id: seats.id });

        if (updatedSeats.length !== seatIds.length) {
          throwError(Errors.SEAT_NOT_AVAILABLE);
        }
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
      return await buildOrderResponse(tx, orderId, now, order);
    });
  },

  /**
   * Lấy lịch sử mua vé của User (Pending Orders & Paid Events).
   * Tự động ẩn số ghế đối với khu vực vé đứng (General Admission).
   */
  async getMyOrdersAndTickets(userId: number) {
    /**
     * 1. Query: Lấy tất cả đơn hàng (đã thanh toán hoặc đang chờ thanh toán mà chưa hết hạn).
     * Query trực tiếp điều kiện thời gian, thay vì lấy hết rồi mới lọc.
     */
    const now = new Date();

    const userOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.userId, userId),
        or(eq(orders.status, 'paid'), and(eq(orders.status, 'pending'), gt(orders.expiresAt, now))),
      ),
      orderBy: [desc(orders.createdAt)],
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

    const pendingOrders: PendingOrderEntry[] = [];
    const paidTicketsFlatList: PaidTicketEntry[] = [];

    for (const order of userOrders) {
      const formatItem = (item: OrderItemWithRelations): FormattedItem => {
        const seat = item.seat;
        const section = seat.section;
        const isGeneral = section.type === 'general';

        let seatLabel: string | null = null;

        if (!isGeneral) {
          const rowCol = `${seat.rowLabel}${seat.colNumber}`;
          seatLabel = seat.prefix ? `${seat.prefix}-${rowCol}` : rowCol;
        }

        return {
          event: seat.show.event,
          show: seat.show,
          item_id: item.id,
          price: Number(item.priceSnapshot).toFixed(2),
          ticket_code: item.ticketCode,

          section_name: section.name,
          seat_type: section.type,
          seat_label: seatLabel,
        };
      };

      if (order.status === 'pending') {
        pendingOrders.push({
          order_id: order.id,
          total_amount: Number(order.totalAmount).toFixed(2),
          status: 'pending',
          expires_at: order.expiresAt.toISOString(),
          created_at: order.createdAt.toISOString(),

          items: order.items.map((item) => {
            const formatted = formatItem(item);
            return {
              event_title: formatted.event.title,
              show_title: formatted.show.title,
              show_date: formatted.show.showDate,
              start_time: formatted.show.startTime.toISOString(),
              section_name: formatted.section_name,
              seat_type: formatted.seat_type,
              seat_label: formatted.seat_label,
              price: formatted.price,
            };
          }),
        });
      } else if (order.status === 'paid') {
        order.items.forEach((item) => {
          const formatted = formatItem(item);
          paidTicketsFlatList.push({
            event: formatted.event,
            ticket: {
              order_item_id: formatted.item_id,
              show_title: formatted.show.title,
              show_date: formatted.show.showDate,
              start_time: formatted.show.startTime.toISOString(),
              section_name: formatted.section_name,
              seat_type: formatted.seat_type,
              seat_label: formatted.seat_label,
              ticket_code: formatted.ticket_code,
              qr_code: null, // Dành cho Sprint 5
              paid_at: order.paidAt ? order.paidAt.toISOString() : null,
            },
          });
        });
      }
    }

    const paidEventsMap = new Map<number, PaidEventEntry>();

    for (const { event, ticket } of paidTicketsFlatList) {
      const eventId = event.id;

      if (!paidEventsMap.has(eventId)) {
        paidEventsMap.set(eventId, {
          event_id: eventId,
          title: event.title,
          venue: event.venue,
          banner_image_url: event.bannerImageUrl,
          tickets: [],
        });
      }

      paidEventsMap.get(eventId)!.tickets.push(ticket);
    }

    return {
      pending_orders: pendingOrders,
      paid_events: Array.from(paidEventsMap.values()),
    };
  },

  async releaseExpiredOrder(orderId: number): Promise<{ releasedSeatIds: number[] }> {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');

      if (!order) {
        // Không có đơn hàng → coi như không có gì để giải phóng
        return { releasedSeatIds: [] };
      }

      if (order.status !== 'pending') {
        // Đã xử lý rồi (paid/cancelled/…) → không làm gì
        return { releasedSeatIds: [] };
      }

      const now = new Date();
      if (order.expiresAt > now) {
        // Chưa hết hạn → giữ nguyên
        return { releasedSeatIds: [] };
      }

      const items = await tx
        .select({ seatId: orderItems.seatId })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      if (items.length === 0) {
        // Không có items vẫn cần hủy order để đồng bộ trạng thái
        await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));
        return { releasedSeatIds: [] };
      }

      const seatIds = items.map((i) => i.seatId);

      // Giải phóng ghế về trạng thái available
      await tx
        .update(seats)
        .set({ status: 'available', lockedBy: null, lockedAt: null })
        .where(inArray(seats.id, seatIds));

      // Hủy đơn hàng
      await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));

      return { releasedSeatIds: seatIds };
    });
  },
};
