import { events, eventShows, orderItems, orders, seats, users } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5173';
const TEST_PASSWORD = '12345678';

export interface TestUser {
  id: number;
  email: string;
  fullName: string;
  role: 'customer' | 'admin';
  cookie: string;
}

// ─── Database singleton (lazy, reused across calls) ─────────────────────────

let _db: Awaited<ReturnType<typeof initDb>> | null = null;
async function initDb() {
  const { drizzle } = await import('drizzle-orm/bun-sql');
  return drizzle(process.env.DATABASE_URL!, { schema: await import('$lib/server/db/schema') });
}
async function getDb() {
  return (_db ??= await initDb());
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function getTestCustomers(count: number = 5): Promise<TestUser[]> {
  const db = await getDb();
  const customers = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.role, 'customer'))
    .limit(count);
  return customers.map((u) => ({ ...u, cookie: '' }));
}

export async function loginAs(email: string, password: string = TEST_PASSWORD): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const cookies = res.headers.getSetCookie?.() ?? [];
  const auth = cookies.find((c) => c.startsWith('auth_token='));
  if (!auth) {
    throw new Error(`No auth_token cookie returned for ${email}`);
  }
  return auth.split(';')[0]; // name=value only
}

export const loginAndGetCookie = loginAs;

// ─── Seat / Order cleanup ──────────────────────────────────────────────────

export async function resetSeat(seatId: number): Promise<void> {
  const db = await getDb();
  await db
    .update(seats)
    .set({ status: 'available', lockedBy: null, lockedAt: null })
    .where(eq(seats.id, seatId));
}

export async function resetSeats(seatIds: number[]): Promise<void> {
  if (seatIds.length === 0) return;
  const db = await getDb();
  await db
    .update(seats)
    .set({ status: 'available', lockedBy: null, lockedAt: null })
    .where(inArray(seats.id, seatIds));
}

export async function cancelPendingOrders(userId: number): Promise<void> {
  const db = await getDb();
  const pendingOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, 'pending')));

  for (const order of pendingOrders) {
    const items = await db
      .select({ seatId: orderItems.seatId })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    const seatIds = items.map((i) => i.seatId);

    if (seatIds.length > 0) {
      await db
        .update(seats)
        .set({ status: 'available', lockedBy: null, lockedAt: null })
        .where(inArray(seats.id, seatIds));
    }

    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    await db.delete(orders).where(eq(orders.id, order.id));
  }
}

export async function cancelAllPendingOrders(): Promise<void> {
  const db = await getDb();
  const pendingOrders = await db.select().from(orders);

  for (const order of pendingOrders) {
    if (order.status === 'pending') {
      const items = await db
        .select({ seatId: orderItems.seatId })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      const seatIds = items.map((i) => i.seatId);

      if (seatIds.length > 0) {
        await db
          .update(seats)
          .set({ status: 'available', lockedBy: null, lockedAt: null })
          .where(inArray(seats.id, seatIds));
      }

      await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
      await db.delete(orders).where(eq(orders.id, order.id));
    }
  }
}

export async function cleanupTestData(): Promise<void> {
  await cancelAllPendingOrders();
}

export async function getSeatStatus(seatId: number): Promise<string> {
  const db = await getDb();
  const [seat] = await db.select({ status: seats.status }).from(seats).where(eq(seats.id, seatId));
  return seat?.status || 'unknown';
}

// ─── Event / Show resolution ───────────────────────────────────────────────

/**
 * Dynamically resolve a published event and its first published show.
 * Avoids hardcoding IDs that change after re-seeding.
 */
export async function resolveEventAndShow(): Promise<{ eventId: number; showId: number }> {
  const db = await getDb();
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.status, 'published'))
    .limit(1);

  if (!event) throw new Error('No published event found. Run seed first.');

  const [show] = await db
    .select({ id: eventShows.id })
    .from(eventShows)
    .where(and(eq(eventShows.eventId, event.id), eq(eventShows.status, 'published')))
    .limit(1);

  if (!show) throw new Error(`No published show found for event ${event.id}.`);

  return { eventId: event.id, showId: show.id };
}

// ─── API call helpers ──────────────────────────────────────────────────────

export async function getAvailableSeatIdsFromDB(
  showId: number,
  count: number = 1,
): Promise<number[]> {
  const db = await getDb();
  const availableSeats = await db
    .select({ id: seats.id })
    .from(seats)
    .where(and(eq(seats.status, 'available'), eq(seats.showId, showId)))
    .limit(count);
  return availableSeats.map((s) => s.id);
}

export async function holdSeats(
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

export async function checkoutOrder(
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

export { BASE_URL };
