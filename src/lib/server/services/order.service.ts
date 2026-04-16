import { db } from '$lib/server/db';
import { orderItems, orders, seats, seatSections } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { and, gte, eq, inArray, or, desc } from 'drizzle-orm';

/* ================= TYPE ================= */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Order = typeof orders.$inferSelect;

type OrderItemWithRelations = typeof orderItems.$inferSelect & {
  seat: typeof seats.$inferSelect & {
    section: typeof seatSections.$inferSelect;
    show: {
      title: string | null;
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
  show: { title: string | null; startTime: Date };
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
        or(
          eq(orders.status, 'paid'),
          and(eq(orders.status, 'pending'), gte(orders.expiresAt, now)),
        ),
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
    const paidEventsMap = paidTicketsFlatList.reduce(
      (acc, curr) => {
        const eventId = curr.event.id;

        if (!acc[eventId]) {
          acc[eventId] = {
            event_id: eventId,
            title: curr.event.title,
            venue: curr.event.venue,
            banner_image_url: curr.event.bannerImageUrl,
            tickets: [],
          };
        }

        acc[eventId].tickets.push(curr.ticket);
        return acc;
      },
      {} as Record<number, PaidEventEntry>,
    );

    return {
      pending_orders: pendingOrders,
      paid_events: Object.values(paidEventsMap),
    };
  },
};
