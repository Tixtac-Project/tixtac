#!/usr/bin/env bun
/**
 * Race Condition Test Suite — NFR-01: No Duplicate Seat Sales
 *
 * Run: bun run test:race
 * (runs scripts/reset-test-data.ts first, then this file)
 *
 * Each test includes step-by-step logging so failures are self-documenting.
 * For manual 2-browser demo instructions, see docs/demo-checklist-race-condition.md.
 */

import {
  cancelAllPendingOrders,
  checkoutOrder,
  getAvailableSeatIdsFromDB,
  getSeatStatus,
  getTestCustomers,
  holdSeats,
  loginAs,
  resolveEventAndShow,
} from './helpers';

// ══════════════════════════════════════════════════════════════════════════════
// Print helpers
// ══════════════════════════════════════════════════════════════════════════════

const SEP = '─'.repeat(60);

function divider() {
  console.log(`\n  ${SEP}`);
}

function step(n: string, instruction: string) {
  divider();
  console.log(`  [${n}]  ${instruction}`);
  divider();
}

function label(key: string, value: unknown) {
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  console.log(`  ${key.padEnd(28)} ${v}`);
}

function verdict(passed: boolean, detail: string) {
  console.log(`\n  ${passed ? '✅ PASS' : '❌ FAIL'}  — ${detail}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// Test suites
// ══════════════════════════════════════════════════════════════════════════════

async function test1_twoUsersHoldSameSeat() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST 1: 2 Users Hold Same Seat Simultaneously               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  step('1.1', 'Clean state & select a test seat');
  await cancelAllPendingOrders();

  const customers = await getTestCustomers(2);
  const { eventId, showId } = await resolveEventAndShow();
  const seatId = (await getAvailableSeatIdsFromDB(showId, 1))[0];
  if (!seatId) {
    console.log('  ⚠️  No available seats');
    return false;
  }
  label('Event ID', eventId);
  label('Show ID', showId);
  label('Seat ID', seatId);
  label('User A', customers[0].email);
  label('User B', customers[1].email);

  step('1.2', 'Both users request the same seat concurrently (Promise.all)');
  const cookieA = await loginAs(customers[0].email);
  const cookieB = await loginAs(customers[1].email);

  const [resA, resB] = await Promise.all([
    holdSeats(eventId, showId, [seatId], cookieA),
    holdSeats(eventId, showId, [seatId], cookieB),
  ]);

  label('User A HTTP status', resA.status);
  label('User B HTTP status', resB.status);
  if (resA.status !== 201) label('User A error body', resA.body);
  if (resB.status !== 201) label('User B error body', resB.body);

  const successCount = [resA.status, resB.status].filter((s) => s === 201).length;
  const conflictCount = [resA.status, resB.status].filter((s) => s === 409).length;
  label('Success (201) count', `${successCount}/2`);
  label('Conflict (409) count', `${conflictCount}/2`);

  step('1.3', 'Verify final database state');
  const seatStatus = await getSeatStatus(seatId);
  label('Seat status', seatStatus);

  const passed = successCount === 1 && conflictCount === 1 && seatStatus === 'locked';
  verdict(passed, 'Exactly 1 success, 1 conflict, seat locked');
  return passed;
}

async function test2_atomicPartialLock() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST 2: Atomic Partial Lock Prevention                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  step('2.1', 'Clean state & select 3 seats');
  await cancelAllPendingOrders();

  const customers = await getTestCustomers(2);
  const { eventId, showId } = await resolveEventAndShow();
  const seatIds = await getAvailableSeatIdsFromDB(showId, 3);
  if (seatIds.length < 3) {
    console.log('  ⚠️  Need 3 seats');
    return false;
  }
  label('Event ID', eventId);
  label('Show ID', showId);
  label('Seat IDs', `[${seatIds.join(', ')}]`);
  label('User B (Bob)', customers[0].email);
  label('User A (Alice)', customers[1].email);

  step('2.2', 'Bob locks the middle seat first');
  const cookieBob = await loginAs(customers[0].email);
  const resBob = await holdSeats(eventId, showId, [seatIds[1]], cookieBob);
  label('Bob hold seat response', resBob.status);

  if (resBob.status !== 201) {
    console.log('  ⚠️  Bob could not lock seat — aborting test');
    return false;
  }

  step('2.3', 'Alice requests all 3 seats (including the one Bob locked)');
  const cookieAlice = await loginAs(customers[1].email);

  const before = await Promise.all(seatIds.map((id) => getSeatStatus(id)));
  seatIds.forEach((id, i) => label(`Seat ${id} (before)`, before[i]));

  const resAlice = await holdSeats(eventId, showId, seatIds, cookieAlice);
  label('Alice response', resAlice.status);
  if (resAlice.status !== 201) label('Alice error body', resAlice.body);

  step('2.4', 'Verify: Alice rejected, zero partial locks');
  const after = await Promise.all(seatIds.map((id) => getSeatStatus(id)));
  seatIds.forEach((id, i) => label(`Seat ${id} (after)`, after[i]));

  const passed =
    resAlice.status === 409 &&
    after[0] === 'available' &&
    after[1] === 'locked' &&
    after[2] === 'available';

  verdict(passed, 'Alice got 409, only seat[1] remains locked');
  return passed;
}

async function test3_nConcurrentRequests() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST 3: N Concurrent Requests — Exactly 1 Success           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const N = 10;

  step('3.1', `Clean state & prepare ${N} users for 1 seat`);
  await cancelAllPendingOrders();

  const customers = await getTestCustomers(N);
  if (customers.length < N) {
    console.log(`  ⚠️  Need ${N} customers`);
    return false;
  }

  const { eventId, showId } = await resolveEventAndShow();
  const seatId = (await getAvailableSeatIdsFromDB(showId, 1))[0];
  if (!seatId) {
    console.log('  ⚠️  No seats');
    return false;
  }
  label('Event ID', eventId);
  label('Show ID', showId);
  label('Target seat ID', seatId);
  label('Concurrent requests', N);

  step('3.2', `Fire ${N} concurrent hold requests`);
  const cookies = await Promise.all(customers.map((c) => loginAs(c.email)));

  const responses = await Promise.all(
    cookies.map((cookie) => holdSeats(eventId, showId, [seatId], cookie)),
  );

  const groups = new Map<number, number>();
  for (const r of responses) {
    groups.set(r.status, (groups.get(r.status) ?? 0) + 1);
  }
  for (const [status, count] of groups) {
    label(`HTTP ${status}`, `${count} / ${N}`);
  }

  step('3.3', 'Verify exactly 1 lock');
  const seatStatus = await getSeatStatus(seatId);
  label('Seat status', seatStatus);

  const successCount = groups.get(201) ?? 0;
  const totalResponses = [...groups.values()].reduce((a, b) => a + b, 0);
  const passed = successCount === 1 && totalResponses === N && seatStatus === 'locked';

  verdict(passed, `1 success, ${N - 1} non-success, seat locked`);
  return passed;
}

async function test4_checkoutRace() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST 4: Concurrent Checkout — Idempotent, Seat Sold Once    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  step('4.1', 'Hold a seat → create pending order');
  await cancelAllPendingOrders();

  const customers = await getTestCustomers(1);
  const { eventId, showId } = await resolveEventAndShow();
  const seatId = (await getAvailableSeatIdsFromDB(showId, 1))[0];
  if (!seatId) {
    console.log('  ⚠️  No seats');
    return false;
  }
  const cookie = await loginAs(customers[0].email);

  const holdRes = await holdSeats(eventId, showId, [seatId], cookie);
  label('Hold response', holdRes.status);

  if (holdRes.status !== 201) {
    console.log('  ⚠️  Hold failed — aborting');
    return false;
  }

  const orderId = (holdRes.body as { data?: { order_id?: number } })?.data?.order_id;
  if (!orderId) {
    console.log('  ⚠️  No order ID');
    return false;
  }
  label('Order ID', orderId);

  step('4.2', 'Fire 2 concurrent checkout calls on the same order');
  const [res1, res2] = await Promise.all([
    checkoutOrder(orderId, cookie),
    checkoutOrder(orderId, cookie),
  ]);

  label('Tab 1 HTTP status', res1.status);
  label('Tab 2 HTTP status', res2.status);
  if (res1.status !== 200) label('Tab 1 body', res1.body);
  if (res2.status !== 200) label('Tab 2 body', res2.body);

  step('4.3', 'Verify: both return 200, seat sold exactly once');
  const seatStatus = await getSeatStatus(seatId);
  label('Seat status', seatStatus);

  const paidCount = [res1.status, res2.status].filter((s) => s === 200).length;
  const passed = paidCount === 2 && seatStatus === 'sold';

  verdict(passed, 'Idempotent — both 200, seat sold once');
  return passed;
}

// ══════════════════════════════════════════════════════════════════════════════
// Runner
// ══════════════════════════════════════════════════════════════════════════════

interface TestEntry {
  name: string;
  run: () => Promise<boolean>;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Race Condition Tests — NFR-01: No Duplicate Seat Sales      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const tests: TestEntry[] = [
    { name: 'Test 1: Two users hold same seat', run: test1_twoUsersHoldSameSeat },
    { name: 'Test 2: Atomic partial lock prevention', run: test2_atomicPartialLock },
    { name: 'Test 3: N concurrent requests', run: test3_nConcurrentRequests },
    { name: 'Test 4: Concurrent checkout race', run: test4_checkoutRace },
  ];

  const results: { name: string; passed: boolean }[] = [];

  for (const test of tests) {
    try {
      results.push({ name: test.name, passed: await test.run() });
    } catch (err) {
      console.error(`\n  💥 UNEXPECTED ERROR in "${test.name}":`, err);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(64));
  console.log('  SUMMARY');
  console.log('═'.repeat(64));

  for (const r of results) {
    console.log(`  ${r.passed ? '✅' : '❌'}  ${r.name}`);
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n  ${passedCount}/${results.length} passed`);

  if (passedCount === results.length) {
    console.log('\n  🎉 All tests passed — NFR-01 verified.\n');
    process.exit(0);
  } else {
    console.log('\n  ❌ Some tests failed.\n');
    process.exit(1);
  }
}

main();
