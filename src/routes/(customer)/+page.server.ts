import { db } from '$lib/server/db';
import { events, seatSections } from '$lib/server/db/schema';
import { eq, ilike, and, desc, min, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// 1. Nhận các tham số từ URL
	const searchQuery = url.searchParams.get('q') || '';
	const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
  const page = rawPage > 0 ? rawPage : 1;

	const limit = 8;
	const offset = (page - 1) * limit;

	// 2. Xây dựng điều kiện lọc
	const conditions = [eq(events.status, 'published')];
	if (searchQuery) {
		conditions.push(ilike(events.title, `%${searchQuery}%`));
	}
	const whereClause = and(...conditions);

	// 3. Đếm tổng số bản ghi (Đúng chuẩn cho phân trang)
	const [{ total }] = await db
		.select({ total: count() })
		.from(events)
		.where(whereClause);

	// 4. Truy vấn danh sách sự kiện kèm theo giá thấp nhất
	const rawEvents = await db
		.select({
			id: events.id,
			title: events.title,
			eventDate: events.eventDate,
			venue: events.venue,
			bannerImageUrl: events.bannerImageUrl,
			// Tính giá thấp nhất từ bảng seatSections
			minPrice: min(seatSections.price)
		})
		.from(events)
		// Nối với bảng seatSections để lấy thông tin giá
		.leftJoin(seatSections, eq(seatSections.eventId, events.id))
		.where(whereClause)
		// Bắt buộc phải Group By khi dùng hàm tổng hợp (min)
		.groupBy(events.id)
		.orderBy(desc(events.createdAt))
		.limit(limit)
		.offset(offset);

	return {
		events: rawEvents.map((e) => ({
			...e,
			min_price: e.minPrice ? Number(e.minPrice) : 0
		})),
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(total / limit) || 1,
			searchQuery,
			totalItems: total
		}
	};
};
