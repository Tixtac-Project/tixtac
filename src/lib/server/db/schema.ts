// src/lib/server/db/schema.ts
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// ══════════════════════════════════════════════════
// ENUMS & TYPES
// ══════════════════════════════════════════════════

export const roleEnum = pgEnum('role', ['admin', 'customer']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

// NOTE: "sold_out" is intentionally excluded — it is a derived/computed state
export const eventStatusEnum = pgEnum('event_status', [
  'draft',
  'published',
  'completed',
  'cancelled',
]);
export const showStatusEnum = pgEnum('show_status', [
  'draft',
  'published',
  'completed',
  'cancelled',
]);

// 'disabled' is used when an Organizer deletes seats from a block to make irregular shapes (cutouts)
export const seatStatusEnum = pgEnum('seat_status', ['available', 'locked', 'sold', 'disabled']);
export const seatTypeEnum = pgEnum('seat_type', ['assigned', 'general']); // assigned = Ngồi, general = Đứng
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'cancelled']);

// ── Types for JSONB Casting ──

export type MapConfigType = {
  width: number;
  height: number;
  gridSize: number;
  snapToGrid: boolean;
};

export type SectionLayoutConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  zIndex?: number;
};

export type SectionSeatConfig = {
  rows: number;
  cols: number;
  prefix: string | null;
  rowFormat: 'alphabetic' | 'numeric'; // Hàng đánh theo A, B, C hay 1, 2, 3
  colDirection: 'ltr' | 'rtl'; // Số ghế đánh từ trái qua phải hay phải qua trái
  startRowIndex: number;
  startColIndex: number;
};

// ══════════════════════════════════════════════════
// TABLES
// ══════════════════════════════════════════════════

// ── Users ──────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    dateOfBirth: date('date_of_birth').notNull(),
    gender: genderEnum('gender').notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    role: roleEnum('role').notNull().default('customer'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_users_demographics').on(table.gender, table.dateOfBirth)],
);

// ── Categories ──────────────────────────────────
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // Để làm URL: /c/nhac-song
  sortOrder: integer('sort_order').notNull().default(0),
});

// ── Events ─────────────────────────────────────
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    termsAndConditions: text('terms_and_conditions'),
    venue: varchar('venue', { length: 200 }).notNull(),
    bannerImageUrl: varchar('banner_image_url', { length: 500 }),
    staticMapImageUrl: varchar('static_map_image_url', { length: 500 }),
    minAge: integer('min_age').notNull().default(0),
    maxTicketsPerUser: integer('max_tickets_per_user').notNull().default(0),

    // Config tổng của Map Builder (Kích thước Canvas)
    mapConfig: jsonb('map_config').$type<MapConfigType>().default({
      width: 1200,
      height: 800,
      gridSize: 20,
      snapToGrid: true,
    }),

    // Chứa các Object định hướng như Sân khấu, Lối vào, FOH
    stageLayout: jsonb('stage_layout').default([]),
    /* Example: [{ "id": "stage", "label": "Sân khấu chính", "type": "stage", "x": 400, "y": 50, "w": 400, "h": 100, "rotation": 0 }] */

    amenities: text('amenities')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    organizerInfo: jsonb('organizer_info').default({}),

    status: eventStatusEnum('status').notNull().default('draft'),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check('chk_min_age_non_negative', sql`${table.minAge} >= 0`),
    check('chk_max_tickets_per_user_non_negative', sql`${table.maxTicketsPerUser} >= 0`),
    index('idx_events_status').on(table.status),
    index('idx_events_category').on(table.categoryId),
    index('idx_events_status_created').on(table.status, table.createdAt),
  ],
);

// ── Event Shows (Sessions / Performances) ──────
export const eventShows = pgTable(
  'event_shows',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }),
    showDate: date('show_date').notNull(),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }),
    itinerary: jsonb('itinerary').default([]),
    status: showStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_event_shows_event').on(table.eventId),
    index('idx_event_shows_date').on(table.showDate),
    index('idx_event_shows_event_date').on(table.eventId, table.showDate),
    uniqueIndex('uq_event_shows_id_event').on(table.id, table.eventId),
    check(
      'chk_show_end_after_start',
      sql`${table.endTime} IS NULL OR ${table.endTime} > ${table.startTime}`,
    ),
  ],
);

// ── Seat Sections ────
export const seatSections = pgTable(
  'seat_sections',
  {
    id: serial('id').primaryKey(),
    showId: integer('show_id')
      .notNull()
      .references(() => eventShows.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    type: seatTypeEnum('type').notNull().default('assigned'), // assigned: vé ngồi, general: vé đứng
    // isSeatPickable: boolean('is_pickable').notNull().default(true), // Will not be implemented now
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    capacity: integer('capacity').notNull().default(0), // Bắt buộc cho vé đứng (general)
    sortOrder: integer('sort_order').notNull().default(0),

    // UI/Layout Configuration trên Canvas (Tọa độ, kích thước, góc xoay, màu sắc)
    layoutConfig: jsonb('layout_config').$type<SectionLayoutConfig>().notNull().default({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      color: '#cccccc',
    }),

    // Rule sinh tự động các ghế bên trong Block (Chỉ áp dụng cho vé ngồi)
    seatConfig: jsonb('seat_config').$type<SectionSeatConfig>().default({
      rows: 0,
      cols: 0,
      prefix: null,
      rowFormat: 'alphabetic',
      colDirection: 'ltr',
      startRowIndex: 1,
      startColIndex: 1,
    }),

    // Materialized seat counters — maintained by DB trigger on seats table
    totalSeats: integer('total_seats').notNull().default(0),
    availableSeats: integer('available_seats').notNull().default(0),
    disabledSeats: integer('disabled_seats').notNull().default(0),

    salesStartAt: timestamp('sales_start_at', { withTimezone: true }),
    salesEndAt: timestamp('sales_end_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_seat_sections_show').on(table.showId),
    index('idx_seat_sections_show_price').on(table.showId, table.price),
  ],
);

// ── Seats (Từng ghế cụ thể) ────────────────────
export const seats = pgTable(
  'seats',
  {
    id: serial('id').primaryKey(),
    sectionId: integer('section_id')
      .notNull()
      .references(() => seatSections.id, { onDelete: 'cascade' }),
    showId: integer('show_id')
      .notNull()
      .references(() => eventShows.id, { onDelete: 'cascade' }),
    prefix: varchar('prefix', { length: 10 }).notNull(),
    rowLabel: varchar('row_label', { length: 5 }).notNull(),
    colNumber: integer('col_number').notNull(),
    // Nếu xóa ghế thừa trên UI (để làm block khuyết góc), status sẽ update thành 'disabled'
    status: seatStatusEnum('status').notNull().default('available'),
    lockedBy: integer('locked_by').references(() => users.id, { onDelete: 'set null' }),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('uq_seat_label_per_show').on(
      table.showId,
      table.prefix,
      table.rowLabel,
      table.colNumber,
    ),
    uniqueIndex('uq_seats_id_show').on(table.id, table.showId),
    index('idx_seats_show_status').on(table.showId, table.status),
    index('idx_seats_section').on(table.sectionId),
    index('idx_seats_section_status').on(table.sectionId, table.status),
    index('idx_seats_section_row_col').on(table.sectionId, table.rowLabel, table.colNumber),
  ],
);

// ── Orders ─────────────────────────────────────
export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_orders_user').on(table.userId, table.status),
    index('idx_orders_expires')
      .on(table.status, table.expiresAt)
      .where(sql`${table.status} = 'pending'`),
    index('idx_orders_analytics')
      .on(table.status, table.createdAt)
      .where(sql`${table.status} = 'paid'`),
    index('idx_orders_dropoff')
      .on(table.status)
      .where(sql`${table.status} IN ('paid', 'cancelled')`),
    index('idx_orders_created_at').on(table.createdAt),
  ],
);

// ── Order Items ────────────────────────────────
export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    seatId: integer('seat_id')
      .notNull()
      .references(() => seats.id, { onDelete: 'restrict' }),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'restrict' }),
    showId: integer('show_id')
      .notNull()
      .references(() => eventShows.id, { onDelete: 'restrict' }),
    priceSnapshot: decimal('price_snapshot', { precision: 12, scale: 2 }).notNull(),
    ticketCode: varchar('ticket_code', { length: 20 }).notNull().unique(), // e.g. "TIX-A3F8K2"
    qrCode: text('qr_code'),
    isCheckedIn: boolean('is_checked_in').notNull().default(false),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_ticket_code').on(table.ticketCode),
    check(
      'chk_checked_in_consistency',
      sql`${table.isCheckedIn} = (${table.checkedInAt} IS NOT NULL)`,
    ),
    index('idx_order_items_event').on(table.eventId),
    index('idx_order_items_event_order').on(table.eventId, table.orderId),
    index('idx_order_items_show').on(table.showId),
    index('idx_order_items_order').on(table.orderId),
  ],
);

// ── Idempotency Keys for Payment Processing ────────────────────────────────
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
    status: text('status').notNull(), // 'processing' | 'completed'
    response: jsonb('response'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_idempotency_keys_created_at').on(table.createdAt)],
);

// ── Password Reset Tokens ──────────────────────────────────────────────────
export const passwordResetTokens = pgTable('password_reset_tokens', {
  tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ══════════════════════════════════════════════════
// RELATIONS
// ══════════════════════════════════════════════════

export const usersRelations = relations(users, ({ many }) => ({
  createdEvents: many(events),
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  category: one(categories, { fields: [events.categoryId], references: [categories.id] }),
  createdByUser: one(users, { fields: [events.createdBy], references: [users.id] }),
  shows: many(eventShows),
}));

export const eventShowsRelations = relations(eventShows, ({ one, many }) => ({
  event: one(events, { fields: [eventShows.eventId], references: [events.id] }),
  sections: many(seatSections),
  seats: many(seats),
}));

export const seatSectionsRelations = relations(seatSections, ({ one, many }) => ({
  show: one(eventShows, { fields: [seatSections.showId], references: [eventShows.id] }),
  seats: many(seats),
}));

export const seatsRelations = relations(seats, ({ one }) => ({
  section: one(seatSections, { fields: [seats.sectionId], references: [seatSections.id] }),
  show: one(eventShows, { fields: [seats.showId], references: [eventShows.id] }),
  lockedByUser: one(users, { fields: [seats.lockedBy], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  seat: one(seats, { fields: [orderItems.seatId], references: [seats.id] }),
  event: one(events, { fields: [orderItems.eventId], references: [events.id] }),
  show: one(eventShows, { fields: [orderItems.showId], references: [eventShows.id] }),
}));
