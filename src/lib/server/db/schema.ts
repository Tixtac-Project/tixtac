// src/lib/server/db/schema.ts
import { sql } from 'drizzle-orm';
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

export const eventStatusEnum = pgEnum('event_status', [
  'draft',
  'published',
  'sold_out',
  'completed',
  'cancelled',
]);
export const seatStatusEnum = pgEnum('seat_status', ['available', 'locked', 'sold', 'disabled']);
export const seatTypeEnum = pgEnum('seat_type', ['assigned', 'general']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'cancelled']);

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
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Events ─────────────────────────────────────
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    venue: varchar('venue', { length: 200 }).notNull(),
    eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
    bannerImageUrl: varchar('banner_image_url', { length: 500 }),
    minAge: integer('min_age').notNull().default(0), // 0 là mọi lứa tuổi
    maxTicketsPerUser: integer('max_tickets_per_user').notNull().default(0), // 0 là không giới hạn
    stageLayout: jsonb('stage_layout').default([]),
    /* Ví dụ data bên trong:
       [
         { "id": "main", "label": "Sân khấu chính", "type": "rect", "x": 10, "y": 0, "w": 20, "h": 5 },
         { "id": "catwalk", "label": "Đường băng", "type": "rect", "x": 18, "y": 5, "w": 4, "h": 10 },
         { "id": "center", "label": "Center Stage", "type": "circle", "x": 20, "y": 20, "radius": 8 }
       ]
    */

    status: eventStatusEnum('status').notNull().default('draft'),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('chk_min_age_non_negative', sql`${table.minAge} >= 0`),
    check('chk_max_tickets_per_user_non_negative', sql`${table.maxTicketsPerUser} >= 0`),
  ],
);

// ── Seat Sections ──────────────────────────────
export const seatSections = pgTable(
  'seat_sections',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id),
    name: varchar('name', { length: 50 }).notNull(),
    type: seatTypeEnum('type').notNull().default('assigned'),
    prefix: varchar('prefix', { length: 10 }).notNull(),
    isSeatPickable: boolean('is_pickable').notNull().default(true),
    rows: integer('rows').notNull(),
    cols: integer('cols').notNull(),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    layoutX: integer('layout_x').notNull().default(0),
    layoutY: integer('layout_y').notNull().default(0),
    startRowIndex: integer('start_row_index').notNull().default(0),
    startColIndex: integer('start_col_index').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_seat_sections_event').on(table.eventId)],
);

// ── Seats ──────────────────────────────────────
export const seats = pgTable(
  'seats',
  {
    id: serial('id').primaryKey(),
    sectionId: integer('section_id')
      .notNull()
      .references(() => seatSections.id),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id),
    prefix: varchar('prefix', { length: 10 }).notNull(),
    rowLabel: varchar('row_label', { length: 5 }).notNull(),
    colNumber: integer('col_number').notNull(),
    status: seatStatusEnum('status').notNull().default('available'),
    lockedBy: integer('locked_by').references(() => users.id),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('uq_seat_label_per_event').on(
      table.eventId,
      table.prefix,
      table.rowLabel,
      table.colNumber,
    ),
    index('idx_seats_event_status').on(table.eventId, table.status),
    index('idx_seats_section').on(table.sectionId),
  ],
);

// ── Orders ─────────────────────────────────────
export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
      .references(() => orders.id),
    seatId: integer('seat_id')
      .notNull()
      .references(() => seats.id),
    priceSnapshot: decimal('price_snapshot', { precision: 12, scale: 2 }).notNull(),
    qrCode: text('qr_code'),
    isCheckedIn: boolean('is_checked_in').notNull().default(false),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'chk_checked_in_consistency',
      sql`${table.isCheckedIn} = (${table.checkedInAt} IS NOT NULL)`,
    ),
  ],
);