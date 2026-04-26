import { db } from '$lib/server/db';
import { orderItems, orders, seats, users } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { select } from 'drizzle-orm';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5173';
const TEST_PASSWORD = '12345678';

export interface TestUser {
  id: number;
  email: string;
  fullName: string;
  role: 'customer' | 'admin';
  cookie: string;
}

async function getDb() {
  const { drizzle } = await import('drizzle-orm/bun-sql');
  const { default: config } = await import('$lib/server/config');
  return drizzle(process.env.DATABASE_URL!, { schema: await import('$lib/server/db/schema') });
}

export async function getTestCustomers(count: number = 5): Promise<TestUser[]> {
  const db = await getDb();
  const customers = await db.select().from(users).where(eq(users.role, 'customer')).limit(count);
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

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`No cookie returned for ${email}`);
  }

  return setCookie.split(';')[0].split('=')[1]
    ? setCookie.split(';')[0]
    : `auth_token=${extractToken(setCookie)}`;
}

function extractToken(setCookie: string): string {
  const match = setCookie.match(/auth_token=([^;]+)/);
  return match ? match[1] : '';
}

export async function loginAndGetCookie(
  email: string,
  password: string = TEST_PASSWORD,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }

  const cookies = res.headers.get('set-cookie');
  if (!cookies) {
    throw new Error(`No cookie returned for ${email}`);
  }

  return cookies.split(',')[0].trim();
}

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
    .where(eq(orders.userId, userId));

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

export async function findSeat(
  seatMapResponse: SeatMapResponse,
  seatId: number,
): Promise<SeatInfo | null> {
  for (const section of seatMapResponse.data.sections) {
    for (const seat of section.seats) {
      if (seat.id === seatId) {
        return seat;
      }
    }
  }
  return null;
}

export async function getSeatMap(
  eventId: number,
  showId: number,
  cookie: string,
): Promise<SeatMapResponse> {
  const res = await fetch(`${BASE_URL}/api/events/${eventId}/shows/${showId}/seats`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) {
    throw new Error(`Failed to get seat map: ${res.status}`);
  }

  return res.json();
}

export async function getAvailableSeatIds(
  eventId: number,
  showId: number,
  cookie: string,
  count: number = 1,
): Promise<number[]> {
  const seatMap = await getSeatMap(eventId, showId, cookie);
  const availableSeats: number[] = [];

  for (const section of seatMap.data.sections) {
    for (const seat of section.seats) {
      if (seat.status === 'available') {
        availableSeats.push(seat.id);
        if (availableSeats.length >= count) {
          return availableSeats;
        }
      }
    }
  }

  return availableSeats;
}

export interface SeatInfo {
  id: number;
  prefix: string;
  row_label: string;
  col_number: number;
  status: 'available' | 'locked' | 'sold' | 'disabled';
}

export interface SeatMapResponse {
  data: {
    show_id: number;
    sections: {
      id: number;
      name: string;
      type: 'assigned' | 'general';
      seats: SeatInfo[];
    }[];
  };
}

export async function cleanupTestData(): Promise<void> {
  await cancelAllPendingOrders();
}

export { BASE_URL };
