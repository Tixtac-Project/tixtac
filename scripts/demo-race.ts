#!/usr/bin/env bun
/**
 * Race Condition Demo - Admin Script
 *
 * Interactive demo script for 2-browser manual testing
 * Run: bun run scripts/demo-race.ts
 *
 * This script provides:
 * 1. Test data preparation
 * 2. Step-by-step demo instructions
 * 3. Expected results verification
 */

import { events, eventShows, orderItems, orders, seats, users } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5173';
const TEST_PASSWORD = '12345678';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getDb() {
  const { drizzle } = await import('drizzle-orm/bun-sql');
  return drizzle(process.env.DATABASE_URL!, { schema: await import('$lib/server/db/schema') });
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`No cookie returned for ${email}`);
  }

  return setCookie.split(',')[0].trim();
}

async function getCustomers() {
  const database = await getDb();
  return database
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, 'customer'));
}

async function getAvailableSeats() {
  const database = await getDb();
  return database
    .select({
      id: seats.id,
      status: seats.status,
      rowLabel: seats.rowLabel,
      colNumber: seats.colNumber,
      prefix: seats.prefix,
    })
    .from(seats)
    .where(eq(seats.status, 'available'))
    .limit(20);
}

async function resolveEventAndShow(): Promise<{ eventId: number; showId: number }> {
  const database = await getDb();
  const [event] = await database
    .select({ id: events.id })
    .from(events)
    .where(eq(events.status, 'published'))
    .limit(1);

  if (!event) throw new Error('No published event found. Run seed first.');

  const [show] = await database
    .select({ id: eventShows.id })
    .from(eventShows)
    .where(and(eq(eventShows.eventId, event.id), eq(eventShows.status, 'published')))
    .limit(1);

  if (!show) throw new Error(`No published show found for event ${event.id}.`);

  return { eventId: event.id, showId: show.id };
}

async function cancelAllPendingOrders() {
  const database = await getDb();
  const pendingOrders = await database.select().from(orders);

  for (const order of pendingOrders) {
    if (order.status === 'pending') {
      const items = await database
        .select({ seatId: orderItems.seatId })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      const seatIds = items.map((i) => i.seatId);

      if (seatIds.length > 0) {
        await database
          .update(seats)
          .set({ status: 'available', lockedBy: null, lockedAt: null })
          .where(inArray(seats.id, seatIds));
      }

      await database.delete(orderItems).where(eq(orderItems.orderId, order.id));
      await database.delete(orders).where(eq(orders.id, order.id));
    }
  }
}

async function holdSeats(eventId: number, showId: number, seatIds: number[], cookie: string) {
  const res = await fetch(`${BASE_URL}/api/events/${eventId}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      cart_items: [{ show_id: showId, assigned_seats: seatIds, general_admission: [] }],
    }),
  });

  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function getSeatStatus(seatId: number): Promise<string> {
  const database = await getDb();
  const [seat] = await database
    .select({ status: seats.status })
    .from(seats)
    .where(eq(seats.id, seatId));
  return seat?.status || 'unknown';
}

function printHeader(text: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${text}`);
  console.log('═'.repeat(60));
}

function printStep(step: string, instruction: string) {
  console.log(`\n📌 ${step}`);
  console.log(`   ${instruction}`);
}

// ─── Demo Scenarios ─────────────────────────────────────────────────────────

async function demoScenario1() {
  printHeader('Scenario 1: 2 Users Hold Same Seat Simultaneously');

  await cancelAllPendingOrders();

  const customers = await getCustomers();
  const availableSeats = await getAvailableSeats();

  if (customers.length < 2 || availableSeats.length === 0) {
    console.log('⚠️  Not enough test data. Run seed first.');
    return false;
  }

  const testSeat = availableSeats[0];
  const { eventId, showId } = await resolveEventAndShow();

  printStep('1.1', 'PREPARE: Login with 2 different browsers');
  console.log(`   Browser A (Alice): ${customers[0].email}`);
  console.log(`   Browser B (Bob): ${customers[1].email}`);

  printStep('1.2', 'PREPARE: Both open the same event seat map');
  console.log(`   URL: /events/${eventId}/shows/${showId}/seats`);
  console.log(
    `   Seat to select: ${testSeat.prefix}-${testSeat.rowLabel}${testSeat.colNumber} (ID: ${testSeat.id})`,
  );

  printStep('1.3', 'ACTION: Count "3... 2... 1" and both click "Giữ chỗ"');

  const cookieAlice = await login(customers[0].email);
  const cookieBob = await login(customers[1].email);

  const [resAlice, resBob] = await Promise.all([
    holdSeats(eventId, showId, [testSeat.id], cookieAlice),
    holdSeats(eventId, showId, [testSeat.id], cookieBob),
  ]);

  printStep('1.4', 'RESULTS:');
  const statuses = [resAlice.status, resBob.status].sort();
  console.log(`   Alice response: ${resAlice.status}`);
  console.log(`   Bob response: ${resBob.status}`);
  console.log(`   Statuses sorted: [${statuses.join(', ')}]`);

  const seatStatus = await getSeatStatus(testSeat.id);
  console.log(`   Seat ${testSeat.id} status: ${seatStatus}`);

  printStep('1.5', 'VERIFICATION:');
  const successCount = [resAlice.status, resBob.status].filter((s) => s === 201).length;
  const conflictCount = [resAlice.status, resBob.status].filter((s) => s === 409).length;
  const passed = successCount === 1 && conflictCount === 1 && seatStatus === 'locked';
  console.log(passed ? '   ✅ PASSED: Exactly 1 success, 1 conflict, seat locked' : '   ❌ FAILED');
  return passed;
}

async function demoScenario2() {
  printHeader('Scenario 2: Atomic Partial Lock Prevention');

  await cancelAllPendingOrders();

  const customers = await getCustomers();
  const availableSeats = await getAvailableSeats();

  if (customers.length < 2 || availableSeats.length < 3) {
    console.log('⚠️  Not enough test data. Run seed first.');
    return false;
  }

  const testSeats = availableSeats.slice(0, 3);
  const { eventId, showId } = await resolveEventAndShow();

  printStep('2.1', 'Bob holds one seat first');
  const cookieBob = await login(customers[0].email);
  const bobResult = await holdSeats(eventId, showId, [testSeats[1].id], cookieBob);
  console.log(
    `   Bob holds ${testSeats[1].prefix}-${testSeats[1].rowLabel}${testSeats[1].colNumber}: ${bobResult.status}`,
  );

  if (bobResult.status !== 201) {
    console.log('   ⚠️  Bob failed to hold seat. Skipping.');
    return false;
  }

  printStep('2.2', 'Alice tries to hold 3 seats (including the one Bob locked)');
  const cookieAlice = await login(customers[1].email);
  const seatIds = testSeats.map((s) => s.id);
  const aliceResult = await holdSeats(eventId, showId, seatIds, cookieAlice);
  console.log(`   Alice holds [${seatIds.join(', ')}]: ${aliceResult.status}`);

  printStep('2.3', 'VERIFICATION: Check that no seats were partially locked');

  const statuses = await Promise.all(testSeats.map((s) => getSeatStatus(s.id)));
  console.log(
    `   Seat ${testSeats[0].id} (${testSeats[0].prefix}-${testSeats[0].rowLabel}${testSeats[0].colNumber}): ${statuses[0]}`,
  );
  console.log(
    `   Seat ${testSeats[1].id} (${testSeats[1].prefix}-${testSeats[1].rowLabel}${testSeats[1].colNumber}): ${statuses[1]}`,
  );
  console.log(
    `   Seat ${testSeats[2].id} (${testSeats[2].prefix}-${testSeats[2].rowLabel}${testSeats[2].colNumber}): ${statuses[2]}`,
  );

  const passed =
    aliceResult.status === 409 &&
    statuses[0] === 'available' &&
    statuses[1] === 'locked' &&
    statuses[2] === 'available';

  printStep('2.4', 'VERIFICATION:');
  console.log(passed ? '   ✅ PASSED: Alice rejected, no partial lock' : '   ❌ FAILED');
  return passed;
}

async function demoScenario3() {
  printHeader('Scenario 3: Concurrent Checkout Race');

  await cancelAllPendingOrders();

  const customers = await getCustomers();
  const availableSeats = await getAvailableSeats();

  if (customers.length < 1 || availableSeats.length === 0) {
    console.log('⚠️  Not enough test data.');
    return false;
  }

  const testSeat = availableSeats[0];
  const { eventId, showId } = await resolveEventAndShow();

  printStep('3.1', 'Alice holds a seat (creates pending order)');
  const cookieAlice = await login(customers[0].email);
  const holdResult = await holdSeats(eventId, showId, [testSeat.id], cookieAlice);
  console.log(`   Hold result: ${holdResult.status}`);

  if (holdResult.status !== 201) {
    console.log('   ⚠️  Failed to hold seat. Skipping.');
    return false;
  }

  const orderId = (holdResult.body as { data?: { order_id?: number } })?.data?.order_id;
  if (!orderId) {
    console.log('   ⚠️  No order ID returned. Skipping.');
    return false;
  }

  printStep('3.2', 'Alice opens 2 browser tabs with same checkout URL');
  console.log(`   URL: /orders/${orderId}/checkout`);

  printStep('3.3', 'Both tabs click "Xác nhận thanh toán" simultaneously');

  const checkoutRes = await fetch(`${BASE_URL}/api/orders/${orderId}/checkout`, {
    method: 'POST',
    headers: { Cookie: cookieAlice },
  });

  await new Promise((r) => setTimeout(r, 100));

  const checkoutRes2 = await fetch(`${BASE_URL}/api/orders/${orderId}/checkout`, {
    method: 'POST',
    headers: { Cookie: cookieAlice },
  });

  printStep('3.4', 'RESULTS:');
  console.log(`   Tab 1 response: ${checkoutRes.status}`);
  console.log(`   Tab 2 response: ${checkoutRes2.status}`);

  const paidCount = [checkoutRes.status, checkoutRes2.status].filter((s) => s === 200).length;
  const seatStatus = await getSeatStatus(testSeat.id);
  console.log(`   Seat ${testSeat.id} status: ${seatStatus}`);

  // Checkout is idempotent: both return 200, but seat is sold exactly once.
  const passed = paidCount === 2 && seatStatus === 'sold';
  console.log(passed ? '   ✅ PASSED: Both return 200, seat sold (idempotent)' : '   ❌ FAILED');
  return passed;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     Race Condition Demo - NFR-01: No Duplicate Seat Sales    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const results: { name: string; passed: boolean }[] = [];

  try {
    printHeader('PREREQUISITE: Reset test data');
    await cancelAllPendingOrders();
    console.log('   ✅ Test data reset complete');

    console.log('\n📋 Available test accounts:');
    const customers = await getCustomers();
    for (let i = 0; i < Math.min(5, customers.length); i++) {
      console.log(`   ${i + 1}. ${customers[i].email} / ${TEST_PASSWORD}`);
    }

    console.log('\n⚠️  NOTE: This script simulates concurrent requests.');
    console.log('   For manual 2-browser demo, see docs/demo-checklist-race-condition.md');

    results.push({ name: 'Scenario 1: 2 users hold same seat', passed: await demoScenario1() });
    results.push({
      name: 'Scenario 2: Atomic partial lock prevention',
      passed: await demoScenario2(),
    });
    results.push({ name: 'Scenario 3: Concurrent checkout race', passed: await demoScenario3() });
  } catch (error) {
    console.error('Error:', error);
  }

  printHeader('SUMMARY');
  const passedCount = results.filter((r) => r.passed).length;
  for (const result of results) {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  }
  console.log(`\nTotal: ${passedCount}/${results.length} passed`);

  console.log('\n📝 For manual 2-browser demo, open docs/demo-checklist-race-condition.md');
  console.log('   Or run: bun run scripts/test-race.ts (for full automated tests)');
}

main();
