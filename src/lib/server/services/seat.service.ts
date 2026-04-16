/*
1. Customer chỉ được xem sự kiện published.
2. Lấy Section và kèm theo (width {seats}) danh sách ghế của nó.
3. Dùng thuộc tính columns của Drizzle để chỉ chọn các cột an toàn, tự động vứt bỏ lockedBy, locketedAt để tránh lộ thông tin của user.
*/

import { db } from '$lib/server/db';
import { eventShows, seatSections, seats } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { asc, eq } from 'drizzle-orm';

/*
1. Lấy sơ đồ ghế của một show
*/
export const seatService = {
  async getSeatMap(eventId: number, showId: number, userRole: 'admin' | 'customer') {
    // 1. Kiểm tra xem events và eventShows có tồn tài không?
    // JOIN/Check events và event_show để đảm bảo tồn tại
    const show = await db.query.eventShows.findFirst({
      where: eq(eventShows.id, showId),
      with: {
        event: true, // luôn lấy data từ bảng event (cha)
      },
    });

    if (!show || show.eventId !== eventId) {
      throwError(Errors.NOT_FOUND, 'Không tìm thấy suất diễn.');
    }

    // 2. Check role customer: chỉ cho xem nếu cả event và show đều published
    if (userRole === 'customer') {
      if (show.status !== 'published' || show.event.status !== 'published') {
        throwError(Errors.NOT_FOUND, 'Suất diễn chưa được mở bán.');
      }
    }

    // 3. TRUY VẤN SECTIONS KÈM THEO SEATS (Tận dụng Relational Queries của Drizzle)
    const sectionsData = await db.query.seatSections.findMany({
      where: eq(seatSections.showId, showId),
      orderBy: [asc(seatSections.sortOrder), asc(seatSections.id)],
      with: {
        seats: {
          orderBy: [asc(seats.rowLabel), asc(seats.colNumber)],
          // loại bỏ lockedBy, lockedAt.
          columns: {
            id: true,
            prefix: true,
            rowLabel: true,
            colNumber: true,
            status: true,
          },
        },
      },
    });

    // 4. map database fields sang JSON format trả về
    const formattedSections = sectionsData.map((sec) => {
      /*
      1. Xử lý visualayout (vì trong DB đang lưu kiểu mảng tọa độ)
      2. Nếu DB chưa có color/width/height/ --> gán giá trị mặc định cho FE vẽ
      */

      const layout = sec.layoutConfig ?? {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        color: '#cccccc',
      };
      const seatConfig = sec.seatConfig ?? {
        rows: 0,
        cols: 0,
        prefix: null,
        rowFormat: 'alphabetic',
        colDirection: 'ltr',
        startRowIndex: 1,
        startColIndex: 1,
      };

      return {
        id: sec.id,
        name: sec.name,
        type: sec.type,
        is_seat_pickable: true, // deprecated — all assigned sections are now pickable
        capacity: sec.capacity,
        price: Number(sec.price).toFixed(2),
        sort_order: sec.sortOrder,
        // Map: layoutConfig
        layout_config: {
          x: layout.x ?? 0,
          y: layout.y ?? 0,
          width: layout.width ?? 100,
          height: layout.height ?? 100,
          rotation: layout.rotation ?? 0,
          color: layout.color ?? '#cccccc',
        },
        // Map: cấu hình ghế
        seat_config: {
          rows: sec.type === 'general' ? 0 : (seatConfig.rows ?? 0),
          cols: sec.type === 'general' ? 0 : (seatConfig.cols ?? 0),
          prefix: seatConfig.prefix,
          rowFormat: seatConfig.rowFormat,
          colDirection: seatConfig.colDirection,
          startRowIndex: seatConfig.startRowIndex,
          startColIndex: seatConfig.startColIndex,
        },

        sales_start_at: sec.salesStartAt ? sec.salesStartAt.toISOString() : null,
        sales_end_at: sec.salesEndAt ? sec.salesEndAt.toISOString() : null,

        seats: sec.seats.map((seat) => ({
          id: seat.id,
          prefix: seat.prefix,
          // Với General Admission (Vé đứng), row_label phải rỗng
          row_label: sec.type === 'general' ? '' : seat.rowLabel,
          col_number: seat.colNumber,
          status: seat.status,
        })),
      };
    });

    return {
      show_id: showId,
      sections: formattedSections,
    };
  },
};
