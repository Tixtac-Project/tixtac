#!/usr/bin/env bun
/// <reference types="node" />
/**
 * Full Database Reset — Clean ALL test data between runs.
 *
 * Run: bun run db:reset
 *
 * This script:
 * 1. Releases ALL locked AND sold seats back to 'available'
 * 2. Deletes ALL orders (both pending and paid) and their items
 * 3. Resets PostgreSQL sequences so IDs start from 1 after re-seed
 * 4. Verifies the cleanup
 *
 * Use this before re-seeding or before each test suite run.
 */

import { db } from '$lib/server/db';
import { orderItems, orders, seats } from '$lib/server/db/schema';
import { ne, sql } from 'drizzle-orm';

async function reset() {
  console.log('🔄 Full database reset...\n');

  // ── 1. Show current state ──
  const allSeats = await db.select().from(seats);
  const pendingOrders = (await db.select().from(orders)).filter((o) => o.status === 'pending');

  console.log('📊 Before:');
  console.log(`  Total seats:     ${allSeats.length}`);
  console.log(`  Available:       ${allSeats.filter((s) => s.status === 'available').length}`);
  console.log(`  Locked:          ${allSeats.filter((s) => s.status === 'locked').length}`);
  console.log(`  Sold:            ${allSeats.filter((s) => s.status === 'sold').length}`);
  console.log(`  Pending orders:  ${pendingOrders.length}`);

  const hasDirtyData = allSeats.some((s) => s.status !== 'available') || pendingOrders.length > 0;

  if (!hasDirtyData) {
    console.log('\n✅ Database is already clean. Nothing to reset.');
    return;
  }

  // ── 2. Release ALL non-available seats back to available ──
  console.log('\n🧹 Releasing all seats...');
  const updated = await db
    .update(seats)
    .set({ status: 'available', lockedBy: null, lockedAt: null })
    .where(ne(seats.status, 'available'))
    .returning({ id: seats.id });
  console.log(`  Released ${updated.length} seats`);

  // ── 3. Delete ALL orders and items (FK cascade handles items, but explicit is safer) ──
  console.log('🧹 Deleting all orders...');
  await db.delete(orderItems);
  const deleted = await db.delete(orders).returning({ id: orders.id });
  console.log(`  Deleted ${deleted.length} orders`);

  // ── 4. Reset sequences ──
  console.log('\n🔄 Resetting sequences...');
  const sequences = [
    'users_id_seq',
    'categories_id_seq',
    'events_id_seq',
    'event_shows_id_seq',
    'seat_sections_id_seq',
    'seats_id_seq',
    'orders_id_seq',
    'order_items_id_seq',
  ];
  for (const seq of sequences) {
    await db.execute(sql.raw(`ALTER SEQUENCE ${seq} RESTART WITH 1`));
  }
  console.log('  Sequences reset');

  // ── 5. Verify ──
  const remainingNonAvailable = await db.select().from(seats).where(ne(seats.status, 'available'));
  const remainingOrders = await db.select().from(orders);

  console.log('\n📊 After:');
  console.log(`  Non-available seats: ${remainingNonAvailable.length}`);
  console.log(`  Remaining orders:    ${remainingOrders.length}`);

  if (remainingNonAvailable.length === 0 && remainingOrders.length === 0) {
    console.log('\n✅ Reset complete — database is clean.');
  } else {
    console.log('\n⚠️  Some data could not be cleaned. Check FK constraints.');
  }
}

async function main() {
  try {
    await reset();
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

main();
