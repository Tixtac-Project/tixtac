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

// ── Enums ──────────────────────────────────────
export const roleEnum = pgEnum('role', ['admin', 'customer']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

// NOTE: "sold_out" is intentionally excluded — it is a derived/computed state
// calculated at the application layer (when available_seats === 0).
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

export const seatStatusEnum = pgEnum('seat_status', ['available', 'locked', 'sold', 'disabled']);
export const seatTypeEnum = pgEnum('seat_type', ['assigned', 'general']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'cancelled']);

// ══════════════════════════════════════════════════
// TABLES
// ══════════════════════════════════════════════════

// ── Users ──────────────────────────────────────
export const users = pgTable('users', {
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
});

// ── Events (General Info — dates live on event_shows) ──────
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(), // Markdown supported
    termsAndConditions: text('terms_and_conditions'), // Markdown supported
    venue: varchar('venue', { length: 200 }).notNull(),
    bannerImageUrl: varchar('banner_image_url', { length: 500 }),
    staticMapImageUrl: varchar('static_map_image_url', { length: 500 }),
    minAge: integer('min_age').notNull().default(0), // 0 = all ages
    maxTicketsPerUser: integer('max_tickets_per_user').notNull().default(0), // 0 = unlimited

    stageLayout: jsonb('stage_layout').default([]),
    /* Example stageLayout:
       [
         { "id": "main", "label": "Sân khấu chính", "type": "rect", "x": 10, "y": 0, "w": 20, "h": 5 },
         { "id": "catwalk", "label": "Đường băng", "type": "rect", "x": 18, "y": 5, "w": 4, "h": 10 }
       ]
    */

    amenities: text('amenities')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    organizerInfo: jsonb('organizer_info').default({}),
    /* Example organizerInfo:
       {
         "name": "TixTac Entertainment",
         "email": "contact@tixtac.io.vn",
         "phone": "+84 28 1234 5678",
         "website": "https://tixtac.io.vn"
       }
    */

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
    title: varchar('title', { length: 200 }), // e.g. "Day 1 — Opening Night"
    showDate: date('show_date').notNull(),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }),

    itinerary: jsonb('itinerary').default([]),
    /* Example itinerary:
       [
         { "time": "18:00", "activity": "Mở cửa", "description": "Check-in và nhận vòng tay" },
         { "time": "19:00", "activity": "DJ Warm-up", "description": "" },
         { "time": "20:00", "activity": "Main Act", "description": "Nghệ sĩ chính biểu diễn" },
         { "time": "22:30", "activity": "Kết thúc", "description": "" }
       ]
    */

    status: showStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_event_shows_event').on(table.eventId),
    check(
      'chk_show_end_after_start',
      sql`${table.endTime} IS NULL OR ${table.endTime} > ${table.startTime}`,
    ),
  ],
);

// ── Seat Sections ──────────────────────────────
export const seatSections = pgTable(
  'seat_sections',
  {
    id: serial('id').primaryKey(),
    showId: integer('show_id')
      .notNull()
      .references(() => eventShows.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    type: seatTypeEnum('type').notNull().default('assigned'),
    prefix: varchar('prefix', { length: 10 }).notNull(),
    isSeatPickable: boolean('is_pickable').notNull().default(true),
    rows: integer('rows').notNull().default(0),
    cols: integer('cols').notNull().default(0),
    capacity: integer('capacity').notNull().default(0), // For general admission sections
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    layoutX: integer('layout_x').notNull().default(0),
    layoutY: integer('layout_y').notNull().default(0),
    startRowIndex: integer('start_row_index').notNull().default(0),
    startColIndex: integer('start_col_index').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),

    visualLayout: jsonb('visual_layout').default([]),
    /* Example visualLayout — coordinates for rendering on interactive map:
       [
         { "x": 10, "y": 20, "w": 50, "h": 30, "label": "Khu VIP Trái" },
         { "x": 70, "y": 20, "w": 50, "h": 30, "label": "Khu VIP Phải" }
       ]
    */

    salesStartAt: timestamp('sales_start_at', { withTimezone: true }),
    salesEndAt: timestamp('sales_end_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_seat_sections_show').on(table.showId)],
);

// ── Seats ──────────────────────────────────────
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
    index('idx_seats_show_status').on(table.showId, table.status),
    index('idx_seats_section').on(table.sectionId),
  ],
);

// ── Orders (Cart — can span multiple shows) ────
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
    priceSnapshot: decimal('price_snapshot', { precision: 12, scale: 2 }).notNull(),

    ticketCode: varchar('ticket_code', { length: 20 }).notNull().unique(),
    /* Unique human-readable code for manual check-in, e.g. "TIX-A3F8K2" */

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
  ],
);

// ══════════════════════════════════════════════════
// RELATIONS (Drizzle Query Builder / N+1 prevention)
// ══════════════════════════════════════════════════

export const usersRelations = relations(users, ({ many }) => ({
  createdEvents: many(events),
  orders: many(orders),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  shows: many(eventShows),
}));

export const eventShowsRelations = relations(eventShows, ({ one, many }) => ({
  event: one(events, {
    fields: [eventShows.eventId],
    references: [events.id],
  }),
  sections: many(seatSections),
  seats: many(seats),
}));

export const seatSectionsRelations = relations(seatSections, ({ one, many }) => ({
  show: one(eventShows, {
    fields: [seatSections.showId],
    references: [eventShows.id],
  }),
  seats: many(seats),
}));

export const seatsRelations = relations(seats, ({ one }) => ({
  section: one(seatSections, {
    fields: [seats.sectionId],
    references: [seatSections.id],
  }),
  show: one(eventShows, {
    fields: [seats.showId],
    references: [eventShows.id],
  }),
  lockedByUser: one(users, {
    fields: [seats.lockedBy],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  seat: one(seats, {
    fields: [orderItems.seatId],
    references: [seats.id],
  }),
}));
