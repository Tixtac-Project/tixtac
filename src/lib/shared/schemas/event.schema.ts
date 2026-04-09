// src/lib/shared/schemas/event.schema.ts
import { getRowLabel, parseSeatLabel, rowLabelToIndex } from '$lib/utils/seat-label';
import { z } from 'zod';

// ── Helpers ────────────────────────────────────
const req = (msg: string) => ({
  error: (issue: { input: unknown }) => (issue.input === undefined ? msg : undefined),
});

const seatLabelRegex = /^[A-Z]+\d+$/; // A1, B12, AA3...

// ── Section Schema ─────────────────────────────
const baseSectionSchema = z.object({
  name: z.string(req('Tên khu vực là bắt buộc')).min(1, 'Tên khu vực không được trống'),

  rows: z
    .number(req('Số hàng là bắt buộc'))
    .int('Số hàng phải là số nguyên')
    .min(1, 'Tối thiểu 1 hàng')
    .max(50, 'Tối đa 50 hàng'),

  cols: z
    .number(req('Số cột là bắt buộc'))
    .int('Số cột phải là số nguyên')
    .min(1, 'Tối thiểu 1 cột')
    .max(100, 'Tối đa 100 cột'),

  price: z.number(req('Giá là bắt buộc')).positive('Giá phải lớn hơn 0'),

  layout_x: z.number().int().min(0, 'layout_x không được âm').default(0),
  layout_y: z.number().int().min(0, 'layout_y không được âm').default(0),

  start_row_index: z.number().int().min(0, 'start_row_index không được âm').default(0),
  start_col_index: z.number().int().min(1, 'start_col_index phải >= 1').default(1),

  disabled_seats: z
    .array(z.string().regex(seatLabelRegex, 'Seat label phải có dạng A1, B12, AA3...'))
    .default([]),

  sort_order: z.number().int().min(0).default(0),
});

// Thêm cross-field validation: disabled_seats phải nằm trong phạm vi section
const sectionSchema = baseSectionSchema.superRefine((section, ctx) => {
  if (!section.disabled_seats || section.disabled_seats.length === 0) return;

  const startRow = section.start_row_index;
  const endRow = startRow + section.rows - 1;
  const startCol = section.start_col_index;
  const endCol = startCol + section.cols - 1;

  // Tính valid row labels để hiển thị trong error message
  const minRowLabel = getRowLabel(startRow);
  const maxRowLabel = getRowLabel(endRow);

  const invalidSeats: string[] = [];

  for (const label of section.disabled_seats) {
    const parsed = parseSeatLabel(label);

    if (!parsed) {
      invalidSeats.push(label);
      continue;
    }

    const rowIndex = rowLabelToIndex(parsed.rowLabel);

    if (
      rowIndex < startRow ||
      rowIndex > endRow ||
      parsed.colNumber < startCol ||
      parsed.colNumber > endCol
    ) {
      invalidSeats.push(label);
    }
  }

  if (invalidSeats.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['disabled_seats'],
      message:
        `Các ghế không nằm trong phạm vi section (` +
        `hàng ${minRowLabel}-${maxRowLabel}, ` +
        `cột ${startCol}-${endCol}): ` +
        `${invalidSeats.join(', ')}`,
    });
  }
});

// ── Event Schema ───────────────────────────────
export const createEventSchema = z
  .object({
    title: z
      .string(req('Tên sự kiện là bắt buộc'))
      .min(5, 'Tên sự kiện tối thiểu 5 ký tự')
      .max(200, 'Tên sự kiện tối đa 200 ký tự'),

    description: z.string(req('Mô tả là bắt buộc')).min(1, 'Mô tả không được trống'),

    venue: z.string(req('Địa điểm là bắt buộc')).min(1, 'Địa điểm không được trống'),

    event_date: z
      .string(req('Ngày sự kiện là bắt buộc'))
      .pipe(z.iso.datetime({ offset: true }))
      .check(z.refine((val) => new Date(val) > new Date(), 'Ngày sự kiện phải trong tương lai')),

    banner_image_url: z.url('URL ảnh không hợp lệ').optional().or(z.literal('')),

    sections: z.array(sectionSchema).min(1, 'Phải có ít nhất 1 khu vực ghế'),
  })
  .check(
    z.refine((data) => {
      const totalSeats = data.sections.reduce((sum, s) => sum + s.rows * s.cols, 0);
      return totalSeats <= 50_000;
    }, 'Tổng số ghế không được vượt quá 50,000'),
  );

// ── Update Sections Schema ─────────────────────
export const updateSectionsSchema = z.object({
  sections: z.array(sectionSchema).min(1, 'Phải có ít nhất 1 khu vực ghế'),
});

// ── Types ──────────────────────────────────────
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateSectionsInput = z.infer<typeof updateSectionsSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
