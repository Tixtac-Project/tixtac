// src/lib/server/db/seed-tickets.ts
import { db } from '$lib/server/db';
import { eventShows, events, orderItems, orders, seats, users } from '$lib/server/db/schema';
import { generateTicketCode } from '$lib/utils/ticket-code';
import * as argon2 from 'argon2';
import { and, eq, like } from 'drizzle-orm';

async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, { type: argon2.argon2id });
}

async function seedTickets() {
  console.log('🎫 Starting Ticketing Test Seed...');

  // 1. Đảm bảo có User Test
  const testEmail = 'hnd1@gmail.com';
  const passwordHash = await hashPassword('12345678');

  console.log(`👤 Checking for test user: ${testEmail}`);
  const existingUser = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);

  let userId: number;
  if (existingUser.length === 0) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: testEmail,
        passwordHash: passwordHash,
        fullName: 'Nguyễn Văn Test',
        role: 'customer',
        gender: 'male',
        dateOfBirth: '1995-01-01',
      })
      .returning();
    userId = newUser.id;
    console.log('✅ Created new test user.');
  } else {
    userId = existingUser[0].id;
    console.log('✅ Test user already exists.');
  }

  // 2. Tìm sự kiện Rock Festival để lấy Suite/Show
  console.log('🎪 Finding Rock Festival shows...');
  const [rockEvent] = await db
    .select()
    .from(events)
    .where(like(events.title, '%Rock Festival%'))
    .limit(1);

  if (!rockEvent) {
    console.error('❌ Could not find Rock Festival. Please run main seed first.');
    return;
  }

  const rockShows = await db.select().from(eventShows).where(eq(eventShows.eventId, rockEvent.id));
  const night1 = rockShows.find((s) => s.title?.includes('Night 1'));
  const night2 = rockShows.find((s) => s.title?.includes('Night 2'));

  if (!night1 || !night2) {
    console.error('❌ Could not find individual Night 1/Night 2 shows.');
    return;
  }

  // 3. Tạo đơn hàng Đã thanh toán - Đêm 1
  console.log('💳 Creating Paid Order for Night 1...');
  const [paidOrder1] = await db
    .insert(orders)
    .values({
      userId,
      totalAmount: '2000000',
      status: 'paid',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      paidAt: new Date(),
    })
    .returning();

  const night1Seats = await db
    .select()
    .from(seats)
    .where(and(eq(seats.showId, night1.id), eq(seats.status, 'available')))
    .limit(2);
  for (const s of night1Seats) {
    const code = generateTicketCode();
    await db.insert(orderItems).values({
      orderId: paidOrder1.id,
      seatId: s.id,
      priceSnapshot: '1000000',
      ticketCode: code,
      qrCode: code,
    });
    await db.update(seats).set({ status: 'sold' }).where(eq(seats.id, s.id));
  }

  // 4. Tạo đơn hàng Đã thanh toán - Đêm 2 (Test grouping)
  console.log('💳 Creating Paid Order for Night 2 (Grouping test)...');
  const [paidOrder2] = await db
    .insert(orders)
    .values({
      userId,
      totalAmount: '2000000',
      status: 'paid',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      paidAt: new Date(),
    })
    .returning();

  const night2Seats = await db
    .select()
    .from(seats)
    .where(and(eq(seats.showId, night2.id), eq(seats.status, 'available')))
    .limit(1);
  for (const s of night2Seats) {
    const code = generateTicketCode();
    await db.insert(orderItems).values({
      orderId: paidOrder2.id,
      seatId: s.id,
      priceSnapshot: '2000000',
      ticketCode: code,
      qrCode: code,
    });
    await db.update(seats).set({ status: 'sold' }).where(eq(seats.id, s.id));
  }

  // 5. Tạo đơn hàng Chờ thanh toán (Countdown test)
  console.log('⏳ Creating Pending Order (Countdown test)...');
  const [pendingOrder] = await db
    .insert(orders)
    .values({
      userId,
      totalAmount: '1600000',
      status: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes left
    })
    .returning();

  const pendingSeats = await db
    .select()
    .from(seats)
    .where(and(eq(seats.showId, night1.id), eq(seats.status, 'available')))
    .limit(2);
  for (const s of pendingSeats) {
    const code = generateTicketCode();
    await db.insert(orderItems).values({
      orderId: pendingOrder.id,
      seatId: s.id,
      priceSnapshot: '800000',
      ticketCode: code,
      qrCode: code,
    });
    await db
      .update(seats)
      .set({ status: 'locked', lockedBy: userId, lockedAt: new Date() })
      .where(eq(seats.id, s.id));
  }

  console.log('\n✨ Seed Tickets Completed!');
  console.log('---------------------------');
  console.log(`Email: ${testEmail}`);
  console.log('Pass:  12345678');
  console.log('---------------------------');
}

seedTickets()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
