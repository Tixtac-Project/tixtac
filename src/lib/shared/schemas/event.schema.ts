// src/lib/shared/schemas/event.schema.ts
import { z } from 'zod';

// ── Helpers ────────────────────────────────────
const req = (msg: string) => ({
  error: (issue: { input: unknown }) => (issue.input === undefined ? msg : undefined),
});

const seatLabelRegex = /^[A-Z]+\d+$/; // A1, B12, AA3...

// ── Section Schema ─────────────────────────────
const sectionSchema = z.object({
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

  // ── Flex Seat — Layout ──
  layout_x: z.number().int().min(0, 'layout_x không được âm').default(0),

  layout_y: z.number().int().min(0, 'layout_y không được âm').default(0),

  // ── Flex Seat — Offset ──
  start_row_index: z.number().int().min(0, 'start_row_index không được âm').default(0),

  start_col_index: z.number().int().min(1, 'start_col_index phải >= 1').default(1),

  // ── Disabled Seats ──
  disabled_seats: z
    .array(z.string().regex(seatLabelRegex, 'Seat label phải có dạng A1, B12, AA3...'))
    .default([]),

  sort_order: z.number().int().min(0).default(0),
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

// ── Update Sections Schema (cho PUT endpoint) ──
export const updateSectionsSchema = z.object({
  sections: z.array(sectionSchema).min(1, 'Phải có ít nhất 1 khu vực ghế'),
});

// ── Types ──────────────────────────────────────
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateSectionsInput = z.infer<typeof updateSectionsSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
