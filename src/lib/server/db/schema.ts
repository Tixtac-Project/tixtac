import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  decimal,
  index,
  integer,
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
export const eventStatusEnum = pgEnum('event_status', ['draft', 'published']);
export const seatStatusEnum = pgEnum('seat_status', ['available', 'locked', 'sold']);
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
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  venue: varchar('venue', { length: 200 }).notNull(),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  bannerImageUrl: varchar('banner_image_url', { length: 500 }),
  status: eventStatusEnum('status').notNull().default('draft'),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Seat Sections ──────────────────────────────
export const seatSections = pgTable('seat_sections', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id),
  name: varchar('name', { length: 50 }).notNull(),
  rows: integer('rows').notNull(),
  cols: integer('cols').notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
    rowLabel: varchar('row_label', { length: 5 }).notNull(),
    colNumber: integer('col_number').notNull(),
    status: seatStatusEnum('status').notNull().default('available'),
    lockedBy: integer('locked_by').references(() => users.id),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_seats_unique').on(table.sectionId, table.rowLabel, table.colNumber),
    index('idx_seats_event_status').on(table.eventId, table.status),
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
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  seatId: integer('seat_id')
    .notNull()
    .references(() => seats.id),
  priceSnapshot: decimal('price_snapshot', { precision: 12, scale: 2 }).notNull(),
  qrCode: text('qr_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
