// src/routes/api/staff/sync/+server.ts
import { requireAuth } from '$lib/server/auth/guards';
import { db } from '$lib/server/db';
import { orderItems, orders } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { apiHandler } from '$lib/server/handler';
import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

export const GET = apiHandler(async ({ locals, url }) => {
  const user = requireAuth(locals);

  // Chỉ staff/admin mới được sync offline data
  // if (user.role !== 'staff' && user.role !== 'admin') {
  if (user.role !== 'admin') {
    throwError(Errors.FORBIDDEN, 'Chỉ nhân viên soát vé mới được đồng bộ dữ liệu.');
  }

  // Trong thực tế: lấy event_id/show_id từ phân quyền của staff.
  // Tạm lấy từ query params để test: ?event_id=12&show_id=34
  const eventId = Number(url.searchParams.get('event_id'));
  const showId = Number(url.searchParams.get('show_id'));

  if (!eventId) {
    throwError(Errors.EVENT_NOT_AVAILABLE, 'Thiếu event_id hoặc show_id.');
  }

  if (!showId) {
    throwError(Errors.SHOW_NOT_AVAILABLE, 'Thiếu event_id hoặc show_id.');
  }

  // Lấy tất cả vé có trạng thái 'paid' (hoặc 'issued') chưa check-in, thuộc event/show được chỉ định.
  // Cho vào service sau, API này để test trước.
  const rows = await db
    .select({
      orderItemId: orderItems.id,
      ticketHash: orderItems.checkinSecretHash, // SHA-256 đã lưu
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orderItems.eventId, eventId),
        eq(orderItems.showId, showId),
        eq(orders.status, 'paid'), // hoặc 'issued'
        eq(orderItems.isCheckedIn, false), // chỉ vé chưa check-in
      ),
    );

  return json({ data: rows }, { status: 200 });
});
