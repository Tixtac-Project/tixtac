import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { and, count, desc, eq, ilike } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  // 1. Nhận từ khóa tìm kiếm và trang hiện tại từ URL (VD: ?q=rock&page=1)
  const searchQuery = url.searchParams.get('q') || '';
  const escapedQuery = searchQuery.replace(/[%_]/g, '\\$&');
  const rawPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = 8; // Hiển thị 8 sự kiện 1 trang
  const offset = (page - 1) * limit;

  // 2. Viết điều kiện lọc (Chỉ lấy sự kiện 'published')
  const conditions = [eq(events.status, 'published')];

  // Nếu user có gõ tìm kiếm, thêm điều kiện tìm theo tiêu đề (ilike: không phân biệt hoa thường)
  if (searchQuery) {
    conditions.push(ilike(events.title, `%${escapedQuery}%`));
  }

  // 3. Query Database
  const eventList = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.createdAt)) // Mới nhất lên đầu
    .limit(limit)
    .offset(offset);

  // 4. Đếm tổng số sự kiện để làm phân trang (Pagination)
  // Tạm thời lấy length để làm demo nhanh, dự án thật sẽ dùng hàm COUNT() của DB
  const totalEvents = await db
    .select({ count: count() })
    .from(events)
    .where(and(...conditions))
    .then((result) => result[0]?.count || 0);

  const totalPages = Math.ceil(totalEvents / limit);
  // 5. Trả dữ liệu về cho Frontend (+page.svelte)
  return {
    events: eventList,
    pagination: {
      currentPage: page,
      totalPages,
      searchQuery,
    },
  };
};
