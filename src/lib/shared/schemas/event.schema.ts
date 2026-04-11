// src/lib/shared/schemas/event.schema.ts
import { getRowLabel, parseSeatLabel, rowLabelToIndex } from '$lib/utils/seat-label';
import { z } from 'zod';

// ── Helpers ────────────────────────────────────
const req = (msg: string) => ({
  error: (issue: { input: unknown }) => (issue.input === undefined ? msg : undefined),
});

const seatLabelRegex = /^[A-Z0-9]+-[A-Z]+[1-9]\d*$/; // VIP-A1, STD-B12, V1-AA3...
const prefixRegex = /^[A-Z0-9]+$/; // Only uppercase letters and digits, no hyphens

// ── Section Schema ─────────────────────────────
const baseSectionSchema = z.object({
  name: z.string(req('Tên khu vực là bắt buộc')).min(1, 'Tên khu vực không được trống'),

  prefix: z
    .string(req('Mã tiền tố là bắt buộc'))
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z
        .string()
        .min(1, 'Mã tiền tố không được trống')
        .max(10, 'Mã tiền tố tối đa 10 ký tự')
        .regex(prefixRegex, 'Mã tiền tố chỉ được chứa chữ in hoa và số (A-Z, 0-9)'),
    ),

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
    .array(
      z
        .string()
        .transform((v) => v.trim().toUpperCase())
        .pipe(z.string().regex(seatLabelRegex, 'Seat label phải có dạng VIP-A1, STD-B12...')),
    )
    .default([]),

  sort_order: z.number().int().min(0).default(0),
});

// Thêm cross-field validation: disabled_seats phải nằm trong phạm vi section và có đúng prefix
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
  const wrongPrefix: string[] = [];

  for (const label of section.disabled_seats) {
    const parsed = parseSeatLabel(label);

    if (!parsed) {
      invalidSeats.push(label);
      continue;
    }

    // Check prefix matches the section's prefix
    if (parsed.prefix !== section.prefix) {
      wrongPrefix.push(label);
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

  if (wrongPrefix.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['disabled_seats'],
      message:
        `Các ghế có prefix không khớp với khu vực "${section.prefix}": ` +
        `${wrongPrefix.join(', ')}`,
    });
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

    banner_image_url: z
      .url('URL ảnh không hợp lệ')
      .refine((url) => /^https?:\/\//i.test(url), 'URL ảnh phải bắt đầu bằng http:// hoặc https://')
      .optional()
      .or(z.literal('')),

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

/** Form-side section type: disabled_seats is a comma-separated string instead of string[] */
export type SectionFormData = Omit<SectionInput, 'disabled_seats'> & { disabled_seats: string };

// ── Draft persistence schema (validates shape/types only, not business rules) ──
const sectionFormDraftSchema = z.object({
  name: z.string(),
  prefix: z.string(),
  price: z.number(),
  rows: z.number().int(),
  cols: z.number().int(),
  layout_x: z.number(),
  layout_y: z.number(),
  start_row_index: z.number(),
  start_col_index: z.number(),
  disabled_seats: z.string(),
  sort_order: z.number(),
});

export const formDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  venue: z.string(),
  date: z
    .object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    })
    .optional(),
  selectedHour: z.string(),
  selectedMinute: z.string(),
  selectedPeriod: z.enum(['AM', 'PM']),
  bannerImageUrl: z.string(),
  sections: z.array(sectionFormDraftSchema).min(1),
});

export type FormDraft = z.infer<typeof formDraftSchema>;

// ── Event Query Schema (Public List API) ───────
export const eventQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export type EventQueryInput = z.infer<typeof eventQuerySchema>;

// ── Event ID Schema (path param validation) ────
export const eventIdSchema = z.coerce.number().int().positive('ID sự kiện không hợp lệ');
