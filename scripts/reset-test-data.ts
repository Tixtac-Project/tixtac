#!/usr/bin/env bun
/**
 * Reset Test Data Script
 *
 * Run before each test to ensure clean state:
 *   bun run scripts/reset-test-data.ts
 *
 * This script:
 * 1. Cancels all pending orders
 * 2. Releases all locked seats back to available
 * 3. Resets PostgreSQL sequences so IDs start from 1
 * 4. Verifies the cleanup
 */

import { db } from '$lib/server/db';
import { orderItems, orders, seats } from '$lib/server/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

async function resetTestData() {
  console.log('🔄 Starting test data reset...\n');

  console.log('📊 Current state:');

  const availableCount = await db.select().from(seats).where(eq(seats.status, 'available'));
  const lockedCount = await db.select().from(seats).where(eq(seats.status, 'locked'));
  const soldCount = await db.select().from(seats).where(eq(seats.status, 'sold'));

  console.log(`  Total seats: ${availableCount.length + lockedCount.length + soldCount.length}`);
  console.log(`  Available: ${availableCount.length}`);
  console.log(`  Locked: ${lockedCount.length}`);
  console.log(`  Sold: ${soldCount.length}`);

  const pendingOrders = await db.select().from(orders);
  const pendingCount = pendingOrders.filter(
    (o: { status: string }) => o.status === 'pending',
  ).length;
  console.log(`  Pending orders: ${pendingCount}`);

  if (lockedCount.length === 0 && pendingCount === 0) {
    console.log('\n✅ Database is already clean. No reset needed.');
    return;
  }

  console.log('\n🧹 Cleaning up...');

  let cleanedSeats = 0;
  let cleanedOrders = 0;

  for (const order of pendingOrders) {
    if (order.status === 'pending') {
      const items = await db
        .select({ seatId: orderItems.seatId })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const seatIds = items.map((i: { seatId: number }) => i.seatId);

      if (seatIds.length > 0) {
        await db
          .update(seats)
          .set({ status: 'available', lockedBy: null, lockedAt: null })
          .where(inArray(seats.id, seatIds));
        cleanedSeats += seatIds.length;
      }

      await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
      await db.delete(orders).where(eq(orders.id, order.id));
      cleanedOrders++;
    }
  }

  console.log(`  Cleaned seats: ${cleanedSeats}`);
  console.log(`  Cleaned orders: ${cleanedOrders}`);

  // Reset PostgreSQL sequences so IDs always start from 1 after seeding
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

  console.log('\n✅ Reset complete!');

  const newAvailableCount = await db.select().from(seats).where(eq(seats.status, 'available'));
  const newLockedCount = await db.select().from(seats).where(eq(seats.status, 'locked'));

  console.log('\n📊 New state:');
  console.log(`  Available: ${newAvailableCount.length}`);
  console.log(`  Locked: ${newLockedCount.length}`);
}

async function main() {
  try {
    await resetTestData();
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

main();
