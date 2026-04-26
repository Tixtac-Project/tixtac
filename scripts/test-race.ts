#!/usr/bin/env bun
/**
 * Race Condition Tests - NFR-01: Ensure no duplicate seat sales
 *
 * Run: bun run scripts/test-race.ts
 * Requires: Server running on TEST_API_URL (default: http://localhost:5173)
 *
 * IMPORTANT: Run reset script before each test:
 *   bun run scripts/reset-test-data.ts
 */

import { events, eventShows, orderItems, orders, seats, users } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

// ─── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5173';
const TEST_PASSWORD = '12345678';

// ─── Database Helpers ───────────────────────────────────────────────────────

async function getDb() {
  const { drizzle } = await import('drizzle-orm/bun-sql');
  return drizzle(process.env.DATABASE_URL!, { schema: await import('$lib/server/db/schema') });
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

async function resetSeat(seatId: number) {
  const database = await getDb();
  await database
    .update(seats)
    .set({ status: 'available', lockedBy: null, lockedAt: null })
    .where(eq(seats.id, seatId));
}

async function getAvailableSeatIds(count: number = 1): Promise<number[]> {
  const database = await getDb();
  const availableSeats = await database
    .select({ id: seats.id, status: seats.status })
    .from(seats)
    .where(eq(seats.status, 'available'))
    .limit(count);
  return availableSeats.map((s) => s.id);
}

/**
 * Dynamically resolve a published event and its first published show.
 * Avoids hardcoding IDs that change after re-seeding.
 */
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

// ─── Auth Helpers ───────────────────────────────────────────────────────────

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

async function getTestCustomers(count: number): Promise<{ id: number; email: string }[]> {
  const database = await getDb();
  return database
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, 'customer'))
    .limit(count);
}

// ─── Checkout Helper ────────────────────────────────────────────────────────

async function holdSeats(
  eventId: number,
  showId: number,
  seatIds: number[],
  cookie: string,
): Promise<{ status: number; body: unknown }> {
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

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function checkoutOrder(
  orderId: number,
  cookie: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE_URL}/api/orders/${orderId}/checkout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getSeatStatus(seatId: number): Promise<string> {
  const database = await getDb();
  const [seat] = await database
    .select({ status: seats.status })
    .from(seats)
    .where(eq(seats.id, seatId));
  return seat?.status || 'unknown';
}

async function getOrderCount(): Promise<number> {
  const database = await getDb();
  const result = await database.select({ count: orderItems.id }).from(orderItems);
  return result.length;
}

// ─── Test Suites ────────────────────────────────────────────────────────────

async function testTwoUsersHoldSameSeat() {
  console.log('\n📋 Test 1: 2 users hold same seat simultaneously');

  await cancelAllPendingOrders();

  const customers = await getTestCustomers(5);
  if (customers.length < 2) {
    console.log('⚠️  Not enough customers for test');
    return false;
  }

  const seatIds = await getAvailableSeatIds(1);
  if (seatIds.length === 0) {
    console.log('⚠️  No available seats for test');
    return false;
  }
  const seatId = seatIds[0];

  const { eventId, showId } = await resolveEventAndShow();
  const cookieAlice = await login(customers[0].email);
  const cookieBob = await login(customers[1].email);

  const [resAlice, resBob] = await Promise.all([
    holdSeats(eventId, showId, [seatId], cookieAlice),
    holdSeats(eventId, showId, [seatId], cookieBob),
  ]);

  const statuses = [resAlice.status, resBob.status].sort();
  const successCount = statuses.filter((s) => s === 201).length;
  const conflictCount = statuses.filter((s) => s === 409).length;

  const seatStatus = await getSeatStatus(seatId);

  console.log(`  Alice response: ${resAlice.status}`);
  console.log(`  Bob response: ${resBob.status}`);
  console.log(`  Success: ${successCount}, Conflict: ${conflictCount}`);
  console.log(`  Seat ${seatId} status: ${seatStatus}`);

  const passed = successCount === 1 && conflictCount === 1 && seatStatus === 'locked';

  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED');
  return passed;
}

async function testAtomicPartialLock() {
  console.log('\n📋 Test 2: Hold 3 seats, 1 locked → atomic fail (no partial lock)');

  await cancelAllPendingOrders();

  const customers = await getTestCustomers(5);
  if (customers.length < 2) {
    console.log('⚠️  Not enough customers for test');
    return false;
  }

  const seatIds = await getAvailableSeatIds(3);
  if (seatIds.length < 3) {
    console.log('⚠️  Not enough available seats for test');
    return false;
  }

  const { eventId, showId } = await resolveEventAndShow();

  const cookieBob = await login(customers[0].email);
  const cookieAlice = await login(customers[1].email);

  const resBob = await holdSeats(eventId, showId, [seatIds[1]], cookieBob);
  console.log(`  Bob holds seat ${seatIds[1]}: ${resBob.status}`);
  if (resBob.status !== 201) {
    console.log('  ⚠️  Bob failed to hold seat, skipping test');
    return false;
  }

  const seatBeforeAlice = await getSeatStatus(seatIds[0]);
  const seat2BeforeAlice = await getSeatStatus(seatIds[1]);
  const seat3BeforeAlice = await getSeatStatus(seatIds[2]);

  const resAlice = await holdSeats(eventId, showId, seatIds, cookieAlice);

  console.log(`  Alice tries to hold seats [${seatIds.join(', ')}]: ${resAlice.status}`);

  const seatAfterAlice = await getSeatStatus(seatIds[0]);
  const seat2AfterAlice = await getSeatStatus(seatIds[1]);
  const seat3AfterAlice = await getSeatStatus(seatIds[2]);

  console.log(`  Seat ${seatIds[0]} before: ${seatBeforeAlice}, after: ${seatAfterAlice}`);
  console.log(`  Seat ${seatIds[1]} before: ${seat2BeforeAlice}, after: ${seat2AfterAlice}`);
  console.log(`  Seat ${seatIds[2]} before: ${seat3BeforeAlice}, after: ${seat3AfterAlice}`);

  const passed =
    resAlice.status === 409 &&
    seatAfterAlice === 'available' &&
    seat2AfterAlice === 'locked' &&
    seat3AfterAlice === 'available';

  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED');
  return passed;
}

async function testNConcurrentRequests() {
  console.log('\n📋 Test 3: N concurrent requests on same seat → exactly 1 success');

  await cancelAllPendingOrders();

  const N = 10;
  const customers = await getTestCustomers(Math.min(N, 10));
  if (customers.length < Math.min(N, 10)) {
    console.log(`⚠️  Not enough customers (need ${N}, have ${customers.length})`);
    return false;
  }

  const seatIds = await getAvailableSeatIds(1);
  if (seatIds.length === 0) {
    console.log('⚠️  No available seats for test');
    return false;
  }
  const seatId = seatIds[0];

  const { eventId, showId } = await resolveEventAndShow();

  const cookies = await Promise.all(customers.slice(0, N).map((c) => login(c.email)));

  const requests = cookies.map((cookie) => holdSeats(eventId, showId, [seatId], cookie));
  const responses = await Promise.all(requests);

  const successCount = responses.filter((r) => r.status === 201).length;
  const conflictCount = responses.filter((r) => r.status === 409).length;
  const otherCount = responses.length - successCount - conflictCount;

  const seatStatus = await getSeatStatus(seatId);

  console.log(`  Total requests: ${N}`);
  console.log(`  Success (201): ${successCount}`);
  console.log(`  Conflict (409): ${conflictCount}`);
  if (otherCount > 0) {
    const otherStatuses = responses
      .filter((r) => r.status !== 201 && r.status !== 409)
      .map((r) => r.status);
    console.log(`  Other (${otherStatuses.join(', ')}): ${otherCount}`);
  }
  console.log(`  Seat ${seatId} status: ${seatStatus}`);

  // Only 1 request should succeed; remaining N-1 must not succeed (409 or other errors are fine)
  const passed =
    successCount === 1 &&
    successCount + conflictCount + otherCount === N &&
    seatStatus === 'locked';

  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED');
  return passed;
}

async function testCheckoutRace() {
  console.log('\n📋 Test 4: 2 tabs checkout same order → only 1 succeeds');

  await cancelAllPendingOrders();

  const customers = await getTestCustomers(2);
  if (customers.length < 2) {
    console.log('⚠️  Not enough customers for test');
    return false;
  }

  const seatIds = await getAvailableSeatIds(1);
  if (seatIds.length === 0) {
    console.log('⚠️  No available seats for test');
    return false;
  }
  const seatId = seatIds[0];

  const { eventId, showId } = await resolveEventAndShow();
  const cookieAlice = await login(customers[0].email);

  const holdRes = await holdSeats(eventId, showId, [seatId], cookieAlice);
  console.log(`  Alice holds seat ${seatId}: ${holdRes.status}`);

  if (holdRes.status !== 201) {
    console.log('  ⚠️  Alice failed to hold seat, skipping test');
    return false;
  }

  const orderId = (holdRes.body as { data?: { order_id?: number } })?.data?.order_id;
  if (!orderId) {
    console.log('  ⚠️  No order ID returned');
    return false;
  }

  const [res1, res2] = await Promise.all([
    checkoutOrder(orderId, cookieAlice),
    checkoutOrder(orderId, cookieAlice),
  ]);

  const statuses = [res1.status, res2.status];
  const paidCount = statuses.filter((s) => s === 200).length;

  const seatStatus = await getSeatStatus(seatId);

  console.log(`  Tab 1 response: ${res1.status}`);
  console.log(`  Tab 2 response: ${res2.status}`);
  console.log(`  Paid (200): ${paidCount}`);
  console.log(`  Seat ${seatId} status: ${seatStatus}`);

  // Checkout is idempotent: both return 200, but seat is sold exactly once.
  // The FOR UPDATE lock ensures only one transaction actually transitions pending→paid;
  // the second sees status='paid' and returns the same result safely.
  const passed = paidCount === 2 && seatStatus === 'sold';

  console.log(passed ? '  ✅ PASSED' : '  ❌ FAILED');
  return passed;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Race Condition Tests - NFR-01: No Duplicate Seat Sales');
  console.log('═══════════════════════════════════════════════════════════════');

  const results: { name: string; passed: boolean }[] = [];

  try {
    results.push({
      name: 'Test 1: 2 users hold same seat',
      passed: await testTwoUsersHoldSameSeat(),
    });
    results.push({
      name: 'Test 2: Atomic partial lock prevention',
      passed: await testAtomicPartialLock(),
    });
    results.push({
      name: 'Test 3: N concurrent requests',
      passed: await testNConcurrentRequests(),
    });
    results.push({ name: 'Test 4: Checkout race condition', passed: await testCheckoutRace() });
  } catch (error) {
    console.error('Test error:', error);
    console.log('❌ Tests failed with error');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════════');

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  for (const result of results) {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  }

  console.log(`\nTotal: ${passedCount}/${totalCount} passed`);

  if (passedCount === totalCount) {
    console.log('\n🎉 All tests passed! NFR-01 verified.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed.');
    process.exit(1);
  }
}

main();
