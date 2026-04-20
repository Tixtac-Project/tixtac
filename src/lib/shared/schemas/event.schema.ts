// src/lib/shared/schemas/event.schema.ts
import { getRowLabel, parseSeatLabel, rowLabelToIndex } from '$lib/utils/seat-label';
import { z } from 'zod';

// ── Helpers ────────────────────────────────────
const req = (msg: string) => ({
  error: (issue: { input: unknown }) => (issue.input === undefined ? msg : undefined),
});

const seatLabelRegex = /^[A-Z0-9]+-[A-Z]+[1-9]\d*$/; // VIP-A1, STD-B12, V1-AA3...
const prefixRegex = /^[A-Z0-9]+$/; // Only uppercase letters and digits, no hyphens

// ── Map Config Schema (Canvas dimensions) ──────
export const mapConfigSchema = z.object({
  width: z.number().int().positive('Chiều rộng Canvas phải > 0').default(1200),
  height: z.number().int().positive('Chiều cao Canvas phải > 0').default(800),
  gridSize: z.number().int().positive('Grid size phải > 0').default(20),
  snapToGrid: z.boolean().default(true),
});

// ── Layout Config Schema (Block positioning on Canvas) ──
export const layoutConfigSchema = z.object({
  x: z.number().min(0, 'x không được âm').default(0),
  y: z.number().min(0, 'y không được âm').default(0),
  width: z.number().min(1, 'Chiều rộng tối thiểu 1').default(100),
  height: z.number().min(1, 'Chiều cao tối thiểu 1').default(100),
  rotation: z.number().default(0),
  color: z.string().default('#cccccc'),
  zIndex: z.number().optional(),
});

// ── Seat Config Schema (Seat generation rules) ─
export const seatConfigSchema = z.object({
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
  prefix: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z
        .string()
        .max(10, 'Mã tiền tố tối đa 10 ký tự')
        .regex(prefixRegex, 'Mã tiền tố chỉ được chứa chữ in hoa và số (A-Z, 0-9)'),
    )
    .nullable()
    .default(null),
  rowFormat: z.enum(['alphabetic', 'numeric']).default('alphabetic'),
  colDirection: z.enum(['ltr', 'rtl']).default('ltr'),
  startRowIndex: z.number().int().min(0, 'startRowIndex không được âm').default(1),
  startColIndex: z.number().int().min(1, 'startColIndex phải >= 1').default(1),
});

// ── Section Schema ─────────────────────────────
const baseSectionSchema = z.object({
  name: z.string(req('Tên khu vực là bắt buộc')).min(1, 'Tên khu vực không được trống'),

  type: z.enum(['assigned', 'general']).default('assigned'),

  capacity: z
    .number()
    .int('Sức chứa phải là số nguyên')
    .min(0, 'Sức chứa không được âm')
    .default(0),

  price: z.number(req('Giá là bắt buộc')).positive('Giá phải lớn hơn 0'),

  sort_order: z.number().int().min(0).default(0),

  layout_config: layoutConfigSchema.default({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    color: '#cccccc',
  }),

  seat_config: seatConfigSchema.default({
    rows: 0,
    cols: 0,
    prefix: null,
    rowFormat: 'alphabetic',
    colDirection: 'ltr',
    startRowIndex: 1,
    startColIndex: 1,
  }),

  disabled_seats: z
    .array(
      z
        .string()
        .transform((v) => v.trim().toUpperCase())
        .pipe(z.string().regex(seatLabelRegex, 'Seat label phải có dạng VIP-A1, STD-B12...')),
    )
    .default([]),

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

// Cross-field validation
const sectionSchema = baseSectionSchema.superRefine((section, ctx) => {
  const seatCfg = section.seat_config;

  // For assigned sections, rows and cols must be > 0
  if (section.type === 'assigned') {
    if (seatCfg.rows < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['seat_config', 'rows'],
        message: 'Khu vực assigned phải có ít nhất 1 hàng',
      });
    }
    if (seatCfg.cols < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['seat_config', 'cols'],
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

  // startRowIndex is 1-based; convert to 0-based for getRowLabel/rowLabelToIndex
  const startRow0 = seatCfg.startRowIndex - 1;
  const endRow0 = startRow0 + seatCfg.rows - 1;
  const startCol = seatCfg.startColIndex;
  const endCol = startCol + seatCfg.cols - 1;

  const minRowLabel = getRowLabel(startRow0);
  const maxRowLabel = getRowLabel(endRow0);

  const invalidSeats: string[] = [];
  const wrongPrefix: string[] = [];

  for (const label of section.disabled_seats) {
    const parsed = parseSeatLabel(label);

    if (!parsed) {
      invalidSeats.push(label);
      continue;
    }

    // Check prefix matches the section's seat_config prefix
    if (seatCfg.prefix && parsed.prefix !== seatCfg.prefix) {
      wrongPrefix.push(label);
      continue;
    }

    const rowIndex = rowLabelToIndex(parsed.rowLabel);

    if (
      rowIndex < startRow0 ||
      rowIndex > endRow0 ||
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
        `Các ghế có prefix không khớp với khu vực "${seatCfg.prefix}": ` +
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
const showSchema = z
  .object({
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
  })
  .superRefine((show, ctx) => {
    if (show.show_date !== show.start_time.slice(0, 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['show_date'],
        message: 'Ngày diễn phải khớp với ngày bắt đầu của suất diễn',
      });
    }

    if (
      show.end_time &&
      show.end_time !== '' &&
      new Date(show.end_time) <= new Date(show.start_time)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_time'],
        message: 'Giờ kết thúc phải sau giờ bắt đầu',
      });
    }
  });

// ── Stage layout item schema (discriminated union) ──
const baseStageItem = { id: z.string(), label: z.string(), x: z.number(), y: z.number() };

// Semantic stage elements from the seatmap builder (all rectangular)
const semanticRectItem = {
  ...baseStageItem,
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
};

const stageLayoutItemSchema = z.discriminatedUnion('type', [
  // Geometric shapes (generic)
  z.object({ ...baseStageItem, type: z.literal('rect'), w: z.number(), h: z.number() }),
  z.object({ ...baseStageItem, type: z.literal('circle'), radius: z.number() }),
  z.object({
    ...baseStageItem,
    type: z.literal('polygon'),
    points: z.array(z.object({ x: z.number(), y: z.number() })),
  }),
  // Semantic elements from seatmap builder (rectangular with rotation)
  z.object({ ...semanticRectItem, type: z.literal('stage') }),
  z.object({ ...semanticRectItem, type: z.literal('obstacle') }),
  z.object({ ...semanticRectItem, type: z.literal('entrance') }),
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

// ── Event Schema (Create — one-shot, backward compat) ──
export const createEventSchema = z.object({
  category_id: z.number(req('Danh mục là bắt buộc')).int().positive('Danh mục không hợp lệ'),

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

  map_config: mapConfigSchema.default({
    width: 1200,
    height: 800,
    gridSize: 20,
    snapToGrid: true,
  }),

  stage_layout: z.array(stageLayoutItemSchema).default([]),

  amenities: z.array(z.string()).default([]),

  organizer_info: organizerInfoSchema,

  shows: z.array(showSchema).min(1, 'Phải có ít nhất 1 suất diễn'),
});

// ═══════════════════════════════════════════════════
// STEP-BASED EVENT CREATION (3-step flow)
// ═══════════════════════════════════════════════════

// ── Step 1: Basic Info ─────────────────────────
// Creates a draft event shell (no shows yet)
export const createBasicInfoSchema = z.object({
  category_id: z.number(req('Danh mục là bắt buộc')).int().positive('Danh mục không hợp lệ'),

  title: z
    .string(req('Tên sự kiện là bắt buộc'))
    .min(5, 'Tên sự kiện tối thiểu 5 ký tự')
    .max(200, 'Tên sự kiện tối đa 200 ký tự'),

  description: z.string(req('Mô tả là bắt buộc')).min(1, 'Mô tả không được trống'),

  terms_and_conditions: z.string().optional().or(z.literal('')),

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

  map_config: mapConfigSchema.default({
    width: 1200,
    height: 800,
    gridSize: 20,
    snapToGrid: true,
  }),

  stage_layout: z.array(stageLayoutItemSchema).default([]),

  amenities: z.array(z.string()).default([]),

  organizer_info: organizerInfoSchema,
});

// ── Step 2: Add Shows ──────────────────────────
// Show without sections (sections added in Step 3)
const showWithoutSectionsSchema = z
  .object({
    title: z.string().max(200, 'Tên suất diễn tối đa 200 ký tự').optional().or(z.literal('')),

    show_date: z.iso.date('Ngày diễn không hợp lệ'),

    start_time: z.string(req('Giờ bắt đầu là bắt buộc')).pipe(z.iso.datetime({ offset: true })),

    end_time: z
      .string()
      .pipe(z.iso.datetime({ offset: true }))
      .optional()
      .or(z.literal('')),

    itinerary: z.array(itineraryItemSchema).default([]),
  })
  .superRefine((show, ctx) => {
    if (show.show_date !== show.start_time.slice(0, 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['show_date'],
        message: 'Ngày diễn phải khớp với ngày bắt đầu của suất diễn',
      });
    }

    if (
      show.end_time &&
      show.end_time !== '' &&
      new Date(show.end_time) <= new Date(show.start_time)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_time'],
        message: 'Giờ kết thúc phải sau giờ bắt đầu',
      });
    }
  });

export const addShowsSchema = z.object({
  event_id: z.number(req('ID sự kiện là bắt buộc')).int().positive('ID sự kiện không hợp lệ'),
  shows: z.array(showWithoutSectionsSchema).min(1, 'Phải có ít nhất 1 suất diễn'),
});

// ── Step 3: Seatmap (sections + seats per show) ──
export const addSeatmapSchema = z.object({
  show_id: z.number(req('ID suất diễn là bắt buộc')).int().positive('ID suất diễn không hợp lệ'),
  sections: z.array(sectionSchema).min(1, 'Phải có ít nhất 1 khu vực ghế'),
  map_config: mapConfigSchema.optional(),
  stage_layout: z.array(stageLayoutItemSchema).optional(),
});

// ── Update Basic Info (for existing draft event) ──
export const updateBasicInfoSchema = createBasicInfoSchema.partial().extend({
  event_id: z.number(req('ID sự kiện là bắt buộc')).int().positive('ID sự kiện không hợp lệ'),
});

// ── Update Show (single show metadata, no sections) ──
export const updateShowSchema = z
  .object({
    title: z.string().max(200, 'Tên suất diễn tối đa 200 ký tự').optional().or(z.literal('')),
    show_date: z.iso.date('Ngày diễn không hợp lệ').optional(),
    start_time: z
      .string()
      .pipe(z.iso.datetime({ offset: true }))
      .optional(),
    end_time: z
      .string()
      .pipe(z.iso.datetime({ offset: true }))
      .optional()
      .or(z.literal('')),
    itinerary: z.array(itineraryItemSchema).optional(),
  })
  .superRefine((show, ctx) => {
    if (show.show_date && show.start_time && show.show_date !== show.start_time.slice(0, 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['show_date'],
        message: 'Ngày diễn phải khớp với ngày bắt đầu của suất diễn',
      });
    }
    if (
      show.end_time &&
      show.end_time !== '' &&
      show.start_time &&
      new Date(show.end_time) <= new Date(show.start_time)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_time'],
        message: 'Giờ kết thúc phải sau giờ bắt đầu',
      });
    }
  });

// ── Update Show Sections Schema ────────────────
export const updateShowSectionsSchema = z.object({
  sections: z.array(sectionSchema).min(1, 'Phải có ít nhất 1 khu vực ghế'),
});

// ── Types ──────────────────────────────────────
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateBasicInfoInput = z.infer<typeof createBasicInfoSchema>;
export type UpdateBasicInfoInput = z.infer<typeof updateBasicInfoSchema>;
export type AddShowsInput = z.infer<typeof addShowsSchema>;
export type AddSeatmapInput = z.infer<typeof addSeatmapSchema>;
export type UpdateShowInput = z.infer<typeof updateShowSchema>;
export type UpdateShowSectionsInput = z.infer<typeof updateShowSectionsSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type ShowInput = z.infer<typeof showSchema>;
export type ItineraryItem = z.infer<typeof itineraryItemSchema>;
export type LayoutConfigInput = z.infer<typeof layoutConfigSchema>;
export type SeatConfigInput = z.infer<typeof seatConfigSchema>;
export type MapConfigInput = z.infer<typeof mapConfigSchema>;

/** Form-side section type: disabled_seats is a comma-separated string instead of string[] */
export type SectionFormData = Omit<SectionInput, 'disabled_seats'> & {
  disabled_seats: string;
  /** @deprecated kept for backward compat with existing drafts; ignored by server */
  is_seat_pickable?: boolean;
};

/** Form-side show type: includes picker state for date/time selectors */
export type ShowFormData = {
  title: string;
  date?: { year: number; month: number; day: number };
  startHour: string;
  startMinute: string;
  startPeriod: 'AM' | 'PM';
  endHour: string;
  endMinute: string;
  endPeriod: 'AM' | 'PM';
  hasEndTime: boolean;
  itinerary: ItineraryItem[];
  sections: SectionFormData[];
};

// ── Draft persistence schema (validates shape/types only, not business rules) ──
const layoutConfigDraftSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(100),
  height: z.number().default(100),
  rotation: z.number().default(0),
  color: z.string().default('#cccccc'),
  zIndex: z.number().optional(),
});

const seatConfigDraftSchema = z.object({
  rows: z.number().int().default(0),
  cols: z.number().int().default(0),
  prefix: z.string().nullable().default(null),
  rowFormat: z.enum(['alphabetic', 'numeric']).default('alphabetic'),
  colDirection: z.enum(['ltr', 'rtl']).default('ltr'),
  startRowIndex: z.number().default(1),
  startColIndex: z.number().default(1),
});

const sectionFormDraftSchema = z.object({
  name: z.string(),
  type: z.enum(['assigned', 'general']).default('assigned'),
  price: z.number(),
  capacity: z.number().int().default(0),
  layout_config: layoutConfigDraftSchema.default({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    color: '#cccccc',
  }),
  seat_config: seatConfigDraftSchema.default({
    rows: 0,
    cols: 0,
    prefix: null,
    rowFormat: 'alphabetic',
    colDirection: 'ltr',
    startRowIndex: 1,
    startColIndex: 1,
  }),
  disabled_seats: z.string(),
  sort_order: z.number(),
  sales_start_at: z.string().default(''),
  sales_end_at: z.string().default(''),
});

const showFormDraftSchema = z.object({
  title: z.string().default(''),
  show_date: z.string().default(''),
  start_time: z.string().default(''),
  end_time: z.string().default(''),
  // Picker state for draft restoration (avoids lossy ISO->AM/PM parsing)
  date: z.object({ year: z.number(), month: z.number(), day: z.number() }).optional(),
  startHour: z.string().default('7'),
  startMinute: z.string().default('0'),
  startPeriod: z.enum(['AM', 'PM']).default('PM'),
  endHour: z.string().default('10'),
  endMinute: z.string().default('0'),
  endPeriod: z.enum(['AM', 'PM']).default('PM'),
  hasEndTime: z.boolean().default(false),
  itinerary: z.array(itineraryItemSchema).default([]),
  sections: z.array(sectionFormDraftSchema).min(1),
});

export const formDraftSchema = z.object({
  category_id: z.number().int().optional(),
  title: z.string(),
  description: z.string(),
  terms_and_conditions: z.string().default(''),
  venue: z.string(),
  bannerImageUrl: z.string(),
  staticMapImageUrl: z.string().default(''),
  min_age: z.number().int().default(0),
  max_tickets_per_user: z.number().int().default(0),
  map_config: mapConfigSchema.default({
    width: 1200,
    height: 800,
    gridSize: 20,
    snapToGrid: true,
  }),
  amenities: z.array(z.string()).default([]),
  organizer_info: organizerInfoSchema,
  organizer_name: z.string().default(''),
  organizer_email: z.string().default(''),
  organizer_phone: z.string().default(''),
  organizer_website: z.string().default(''),
  shows: z.array(showFormDraftSchema).min(1),
});

export type FormDraft = z.infer<typeof formDraftSchema>;

// ── Event Query Schema (Public List API) ───────
export const eventQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(), // Filter by category slug
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export type EventQueryInput = z.infer<typeof eventQuerySchema>;

// ── Event ID Schema (path param validation) ────
export const eventIdSchema = z.coerce.number().int().positive('ID sự kiện không hợp lệ');

// ── Show ID Schema (path param validation) ─────
export const showIdSchema = z.coerce.number().int().positive('ID suất diễn không hợp lệ');

export const generalAdmissionInputSchema = z.object({
  section_id: z.number().int().positive(),
  quantity: z.number().int().min(1),
});

export const cartItemSchema = z.object({
  show_id: z.number().int().positive(),
  assigned_seats: z.array(z.number().int().positive()).default([]),
  general_admission: z.array(generalAdmissionInputSchema).default([]),
}).superRefine((data, ctx) => {
  if (data.assigned_seats.length === 0 && data.general_admission.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['cart_items'],
      message: 'Mỗi suất diễn phải có ít nhất 1 vé assigned hoặc general admission',
    });
  }
});

export const checkoutBodySchema = z.object({
  cart_items: z.array(cartItemSchema).min(1, 'Giỏ hàng không được trống'),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type GeneralAdmissionInput = z.infer<typeof generalAdmissionInputSchema>;
