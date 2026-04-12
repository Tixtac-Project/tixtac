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

  type: z.enum(['assigned', 'general']).default('assigned'),

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

  is_seat_pickable: z.boolean().default(true),

  rows: z
    .number(req('Số hàng là bắt buộc'))
    .int('Số hàng phải là số nguyên')
    .min(0, 'Số hàng không được âm')
    .max(50, 'Tối đa 50 hàng')
    .default(0),

  cols: z
    .number(req('Số cột là bắt buộc'))
    .int('Số cột phải là số nguyên')
    .min(0, 'Số cột không được âm')
    .max(100, 'Tối đa 100 cột')
    .default(0),

  capacity: z
    .number()
    .int('Sức chứa phải là số nguyên')
    .min(0, 'Sức chứa không được âm')
    .default(0),

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

  sales_start_at: z
    .string()
    .pipe(z.iso.datetime({ offset: true }))
    .optional()
    .or(z.literal('')),

  sales_end_at: z
    .string()
    .pipe(z.iso.datetime({ offset: true }))
    .optional()
    .or(z.literal('')),
});

// Thêm cross-field validation: disabled_seats phải nằm trong phạm vi section và có đúng prefix
const sectionSchema = baseSectionSchema.superRefine((section, ctx) => {
  // For assigned sections, rows and cols must be > 0
  if (section.type === 'assigned') {
    if (section.rows < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['rows'],
        message: 'Khu vực assigned phải có ít nhất 1 hàng',
      });
    }
    if (section.cols < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['cols'],
        message: 'Khu vực assigned phải có ít nhất 1 cột',
      });
    }
  }

  // For general admission, capacity must be > 0
  if (section.type === 'general') {
    if (section.capacity < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['capacity'],
        message: 'Khu vực general admission phải có sức chứa > 0',
      });
    }
  }

  if (!section.disabled_seats || section.disabled_seats.length === 0) return;

  // Disabled seats validation only applies to assigned sections
  if (section.type === 'general') return;

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

// ── Itinerary Item Schema ──────────────────────
const itineraryItemSchema = z.object({
  time: z.string().min(1, 'Thời gian không được trống'),
  activity: z.string().min(1, 'Hoạt động không được trống'),
  description: z.string().default(''),
});

// ── Show Schema ────────────────────────────────
const showSchema = z.object({
  title: z.string().max(200, 'Tên suất diễn tối đa 200 ký tự').optional().or(z.literal('')),

  show_date: z.iso.date('Ngày diễn không hợp lệ'),

  start_time: z.string(req('Giờ bắt đầu là bắt buộc')).pipe(z.iso.datetime({ offset: true })),

  end_time: z
    .string()
    .pipe(z.iso.datetime({ offset: true }))
    .optional()
    .or(z.literal('')),

  itinerary: z.array(itineraryItemSchema).default([]),

  sections: z.array(sectionSchema).min(1, 'Mỗi suất diễn phải có ít nhất 1 khu vực ghế'),
});

// ── Stage layout item schema (discriminated union) ──
const baseStageItem = { id: z.string(), label: z.string(), x: z.number(), y: z.number() };

const stageLayoutItemSchema = z.discriminatedUnion('type', [
  z.object({ ...baseStageItem, type: z.literal('rect'), w: z.number(), h: z.number() }),
  z.object({ ...baseStageItem, type: z.literal('circle'), radius: z.number() }),
  z.object({
    ...baseStageItem,
    type: z.literal('polygon'),
    points: z.array(z.object({ x: z.number(), y: z.number() })),
  }),
]);

// ── Organizer Info Schema ──────────────────────
const organizerInfoSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
  })
  .optional();

// ── Event Schema (Create) ──────────────────────
export const createEventSchema = z.object({
  title: z
    .string(req('Tên sự kiện là bắt buộc'))
    .min(5, 'Tên sự kiện tối thiểu 5 ký tự')
    .max(200, 'Tên sự kiện tối đa 200 ký tự'),

  description: z.string(req('Mô tả là bắt buộc')).min(1, 'Mô tả không được trống'), // Markdown

  terms_and_conditions: z.string().optional().or(z.literal('')), // Markdown

  venue: z.string(req('Địa điểm là bắt buộc')).min(1, 'Địa điểm không được trống'),

  banner_image_url: z
    .url('URL ảnh không hợp lệ')
    .refine((url) => /^https?:\/\//i.test(url), 'URL ảnh phải bắt đầu bằng http:// hoặc https://')
    .optional()
    .or(z.literal('')),

  static_map_image_url: z
    .url('URL ảnh sơ đồ không hợp lệ')
    .refine((url) => /^https?:\/\//i.test(url), 'URL ảnh phải bắt đầu bằng http:// hoặc https://')
    .optional()
    .or(z.literal('')),

  min_age: z.number().int().min(0, 'Tuổi tối thiểu không được âm').default(0),

  max_tickets_per_user: z
    .number()
    .int()
    .min(0, 'Giới hạn vé không được âm (0 = không giới hạn)')
    .default(0),

  stage_layout: z.array(stageLayoutItemSchema).default([]),

  amenities: z.array(z.string()).default([]),

  organizer_info: organizerInfoSchema,

  shows: z.array(showSchema).min(1, 'Phải có ít nhất 1 suất diễn'),
});

// ── Update Show Sections Schema ────────────────
export const updateShowSectionsSchema = z.object({
  sections: z.array(sectionSchema).min(1, 'Phải có ít nhất 1 khu vực ghế'),
});

// ── Types ──────────────────────────────────────
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateShowSectionsInput = z.infer<typeof updateShowSectionsSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type ShowInput = z.infer<typeof showSchema>;
export type ItineraryItem = z.infer<typeof itineraryItemSchema>;

/** Form-side section type: disabled_seats is a comma-separated string instead of string[] */
export type SectionFormData = Omit<SectionInput, 'disabled_seats'> & { disabled_seats: string };

// ── Draft persistence schema (validates shape/types only, not business rules) ──
const sectionFormDraftSchema = z.object({
  name: z.string(),
  type: z.enum(['assigned', 'general']),
  prefix: z.string(),
  is_seat_pickable: z.boolean(),
  price: z.number(),
  rows: z.number().int(),
  cols: z.number().int(),
  capacity: z.number().int().default(0),
  layout_x: z.number(),
  layout_y: z.number(),
  start_row_index: z.number(),
  start_col_index: z.number(),
  disabled_seats: z.string(),
  sort_order: z.number(),
});

const showFormDraftSchema = z.object({
  title: z.string().default(''),
  show_date: z.string().default(''),
  start_time: z.string().default(''),
  end_time: z.string().default(''),
  itinerary: z.array(itineraryItemSchema).default([]),
  sections: z.array(sectionFormDraftSchema).min(1),
});

export const formDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  terms_and_conditions: z.string().default(''),
  venue: z.string(),
  bannerImageUrl: z.string(),
  staticMapImageUrl: z.string().default(''),
  min_age: z.number().int().default(0),
  max_tickets_per_user: z.number().int().default(0),
  amenities: z.array(z.string()).default([]),
  organizer_info: organizerInfoSchema,
  shows: z.array(showFormDraftSchema).min(1),
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

// ── Show ID Schema (path param validation) ─────
export const showIdSchema = z.coerce.number().int().positive('ID suất diễn không hợp lệ');
