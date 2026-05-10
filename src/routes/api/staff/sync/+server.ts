// src/routes/api/staff/sync/+server.ts
import { requireAuth } from '$lib/server/auth/guards';
import { db } from '$lib/server/db';
import { orderItems, orders } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { apiHandler } from '$lib/server/handler';
import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const querySchema = z.object({
  event_id: z.coerce.number().int().positive(),
  show_id: z.coerce.number().int().positive(),
});

export const GET = apiHandler(async ({ locals, url }) => {
  const user = requireAuth(locals);

  // Chỉ staff/admin mới được sync offline data
  // if (user.role !== 'staff' && user.role !== 'admin') {
  if (user.role !== 'admin') {
    throwError(Errors.FORBIDDEN, 'Chỉ nhân viên soát vé mới được đồng bộ dữ liệu.');
  }

  // TODO: Validate query parameters will be restructured in shared/schema later; they are currently for testing purposes.
  const result = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!result.success) {
    throwError(Errors.BAD_REQUEST, 'Thiếu hoặc ID không hợp lệ.');
  }

  const { event_id: eventId, show_id: showId } = result.data;

  // Lấy tất cả vé có trạng thái 'paid' (hoặc 'issued') chưa check-in, thuộc event/show được chỉ định.
  // TODO: Database Query will be restructured in service later; they are currently for testing purposes.
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
