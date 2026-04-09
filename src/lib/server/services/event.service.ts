import { db } from '$lib/server/db';
import { events, seatSections, seats } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

interface SectionInput {
  name: string;
  rows: number;
  cols: number;
  price: number;
  sort_order?: number;
}

interface CreateEventInput {
  title: string;
  description: string;
  venue: string;
  event_date: string;
  banner_image_url?: string | null;
  sections: SectionInput[];
}

function rowLabelFromIndex(index: number): string {
  let label = '';
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

// Validation
class ValidationError extends Error {
  public details: Record<string, string[]>;
  constructor(message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details || {};
  }
}

function validateCreateEventInput(data: unknown): asserts data is CreateEventInput {
  const input = data as Partial<CreateEventInput>;
  const errors: Record<string, string[]> = {};

  if (!input.title || typeof input.title !== 'string') errors.title = ['Bắt buộc'];
  else if (input.title.length < 5 || input.title.length > 200) errors.title = ['5-200 ký tự'];

  if (!input.description || typeof input.description !== 'string')
    errors.description = ['Bắt buộc'];

  if (!input.venue || typeof input.venue !== 'string') errors.venue = ['Bắt buộc'];

  if (!input.event_date) errors.event_date = ['Bắt buộc'];
  else {
    const date = new Date(input.event_date);
    if (isNaN(date.getTime())) errors.event_date = ['Định dạng ngày không hợp lệ'];
    else if (date <= new Date()) errors.event_date = ['Phải trong tương lai'];
  }

  if (input.banner_image_url) {
    try {
      new URL(input.banner_image_url);
    } catch {
      errors.banner_image_url = ['URL không hợp lệ'];
    }
  }

  if (!Array.isArray(input.sections) || input.sections.length === 0) {
    errors.sections = ['Ít nhất 1 khu vực'];
  } else {
    input.sections.forEach((sec: unknown, idx: number) => {
      const s = sec as Partial<SectionInput>;
      const prefix = `sections[${idx}].`;
      if (!s.name || typeof s.name !== 'string') errors[prefix + 'name'] = ['Bắt buộc'];

      const rows = s.rows;
      if (rows === undefined || !Number.isInteger(rows) || rows < 1 || rows > 50) {
        errors[prefix + 'rows'] = ['1-50'];
      }
      const cols = s.cols;
      if (cols === undefined || !Number.isInteger(cols) || cols < 1 || cols > 50) {
        errors[prefix + 'cols'] = ['1-50'];
      }

      if (typeof s.price !== 'number' || s.price <= 0) errors[prefix + 'price'] = ['> 0'];
    });
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Dữ liệu không hợp lệ', errors);
  }
}

export async function createEvent(adminId: number, data: unknown) {
  validateCreateEventInput(data);
  const input = data;

  return await db.transaction(async (tx) => {
    // 1. Insert event
    const [event] = await tx
      .insert(events)
      .values({
        title: input.title,
        description: input.description,
        venue: input.venue,
        eventDate: new Date(input.event_date),
        bannerImageUrl: input.banner_image_url ?? null,
        status: 'draft',
        createdBy: adminId,
      })
      .returning();

    if (!event) throw new Error('Không thể tạo sự kiện');

    // 2. Insert sections và generate seats
    const sectionsResult = [];
    let totalSeats = 0;

    for (const secData of input.sections) {
      const [section] = await tx
        .insert(seatSections)
        .values({
          eventId: event.id,
          name: secData.name,
          rows: secData.rows,
          cols: secData.cols,
          price: secData.price.toString(),
          sortOrder: secData.sort_order ?? 0,
        })
        .returning();

      if (!section) throw new Error(`Không thể tạo khu vực ${secData.name}`);

      // Generate seat values
      const seatValues: (typeof seats.$inferInsert)[] = [];
      for (let r = 0; r < secData.rows; r++) {
        const rowLabel = rowLabelFromIndex(r);
        for (let c = 1; c <= secData.cols; c++) {
          seatValues.push({
            sectionId: section.id,
            eventId: event.id,
            rowLabel,
            colNumber: c,
            status: 'available',
          });
        }
      }

      if (seatValues.length > 0) {
        await tx.insert(seats).values(seatValues);
      }

      const seatCount = secData.rows * secData.cols;
      totalSeats += seatCount;

      sectionsResult.push({
        id: section.id,
        name: section.name,
        rows: section.rows,
        cols: section.cols,
        price: section.price,
        seat_count: seatCount,
      });
    }

    return {
      id: event.id,
      title: event.title,
      status: event.status,
      total_seats: totalSeats,
      sections: sectionsResult,
    };
  });
}

export async function publishEvent(eventId: number) {
  // Lấy event hiện tại
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) {
    throw new Error('EVENT_NOT_FOUND');
  }
  if (event.status === 'published') {
    throw new Error('ALREADY_PUBLISHED');
  }

  // Cập nhật trạng thái
  const [updated] = await db
    .update(events)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning({ id: events.id, status: events.status });

  return updated;
}
