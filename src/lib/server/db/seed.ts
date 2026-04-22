// src/lib/server/db/seed.ts
import { db } from '$lib/server/db';
import {
  categories,
  events,
  eventShows,
  orderItems,
  orders,
  seats,
  seatSections,
  users,
} from '$lib/server/db/schema';
import { getEventSeeds, type ShowSeed } from '$lib/server/db/seed-data';
import { generateTicketCode } from '$lib/utils/ticket-code';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';

// ── Password Hashing ───────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, { type: argon2.argon2id });
}

// ── Row Label Helper ───────────────────────────
function getRowLabel(index: number): string {
  let label = '';
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

// ── Simple Random Helpers ──────────────────────
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDate(startYear: number, endYear: number): string {
  const y = randInt(startYear, endYear);
  const m = String(randInt(1, 12)).padStart(2, '0');
  const d = String(randInt(1, 28)).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function randPhone(): string {
  const prefixes = ['090', '091', '093', '097', '098', '032', '033', '034'] as const;
  return randPick(prefixes) + String(randInt(1000000, 9999999));
}

function toAscii(str: string): string {
  return str
    .replace(/[đ]/g, 'd')
    .replace(/[Đ]/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const FIRST_M = [
  'Minh',
  'Hung',
  'Duc',
  'Thang',
  'Quang',
  'Tuan',
  'Long',
  'Phuc',
  'Bao',
  'Khang',
] as const;
const FIRST_F = [
  'Linh',
  'Huong',
  'Trang',
  'Ngoc',
  'Mai',
  'Thu',
  'Ha',
  'Lan',
  'Anh',
  'Thao',
] as const;
const LAST = [
  'Nguyen',
  'Tran',
  'Le',
  'Pham',
  'Hoang',
  'Huynh',
  'Phan',
  'Vu',
  'Vo',
  'Dang',
] as const;
const MIDDLE = ['Van', 'Thi', 'Dinh', 'Cong', 'Minh', 'Quoc', 'Thanh', 'Huu'] as const;

function generateUser(index: number) {
  const gender = randPick(['male', 'female', 'other'] as const);
  const first = gender === 'female' ? randPick(FIRST_F) : randPick(FIRST_M);
  const fullName = `${randPick(LAST)} ${randPick(MIDDLE)} ${first}`;
  const email = `${toAscii(first)}${index}@gmail.com`;
  return { email, fullName, dateOfBirth: randDate(1980, 2005), gender, phone: randPhone() };
}

// ── Seat generation Logic ──────────────────────
async function createShowWithSections(eventId: number, show: ShowSeed) {
  const [newShow] = await db
    .insert(eventShows)
    .values({
      eventId,
      title: show.title || null,
      showDate: show.showDate,
      startTime: show.startTime,
      endTime: show.endTime || null,
      itinerary: show.itinerary ?? [],
      status: show.status,
    })
    .returning();

  for (const s of show.sections) {
    const [section] = await db
      .insert(seatSections)
      .values({
        showId: newShow.id,
        name: s.name,
        type: s.type,
        capacity: s.capacity,
        price: s.price,
        sortOrder: s.sortOrder,
        layoutConfig: s.layoutConfig,
        seatConfig: s.seatConfig,
        salesStartAt: s.salesStartAt || null,
        salesEndAt: s.salesEndAt || null,
      })
      .returning();

    const seatCfg = s.seatConfig;
    const seatValues = [];

    // GA sections: generate virtual placeholder seats (one per capacity unit)
    if (s.type === 'general') {
      const gaPrefix = seatCfg.prefix || 'GA';
      for (let i = 1; i <= s.capacity; i++) {
        seatValues.push({
          sectionId: section.id,
          showId: newShow.id,
          prefix: gaPrefix,
          rowLabel: '1',
          colNumber: i,
          status: 'available' as const,
        });
      }
    } else {
      // Assigned sections: generate real seats from config
      const disabledSet = new Set(s.disabledSeats ?? []);
      const prefixStr = seatCfg.prefix ? `${seatCfg.prefix}-` : '';

      for (let r = 0; r < seatCfg.rows; r++) {
        const rowLabel =
          seatCfg.rowFormat === 'alphabetic'
            ? getRowLabel(seatCfg.startRowIndex + r - 1)
            : String(seatCfg.startRowIndex + r);

        for (let c = 0; c < seatCfg.cols; c++) {
          const colNumber =
            seatCfg.colDirection === 'ltr'
              ? seatCfg.startColIndex + c
              : seatCfg.startColIndex + (seatCfg.cols - 1 - c);

          const rowColSep = seatCfg.rowFormat === 'numeric' ? '-' : '';
          const label = `${prefixStr}${rowLabel}${rowColSep}${colNumber}`;

          seatValues.push({
            sectionId: section.id,
            showId: newShow.id,
            prefix: seatCfg.prefix || '',
            rowLabel,
            colNumber,
            status: disabledSet.has(label) ? ('disabled' as const) : ('available' as const),
          });
        }
      }
    }

    // Batch insert seats
    for (let i = 0; i < seatValues.length; i += 1000) {
      await db.insert(seats).values(seatValues.slice(i, i + 1000));
    }
  }

  return newShow;
}

// ══════════════════════════════════════════════════
// MAIN SEED
// ══════════════════════════════════════════════════
export async function seed() {
  console.log('🌱 Starting seed…');

  // ── 1. Clean data (FK order) ──
  console.log('🧹 Cleaning data…');
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(seats);
  await db.delete(seatSections);
  await db.delete(eventShows);
  await db.delete(events);
  await db.delete(categories);

  // ── 2. Admin ──
  await db
    .insert(users)
    .values({
      email: 'admin@tixtac.io.vn',
      passwordHash: await hashPassword('12345678'),
      fullName: 'Admin Tixtac',
      dateOfBirth: '1990-01-15',
      gender: 'male',
      role: 'admin',
    })
    .onConflictDoNothing({ target: users.email });

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@tixtac.io.vn'))
    .limit(1);
  console.log(`👤 Admin: ${admin.email}`);

  // ── 3. 10 Random Customers ──
  const customerPwHash = await hashPassword('12345678');
  for (let i = 1; i <= 10; i++) {
    const u = generateUser(i);
    await db
      .insert(users)
      .values({ ...u, passwordHash: customerPwHash, role: 'customer' })
      .onConflictDoNothing({ target: users.email });
  }
  console.log('👥 10 random customers seeded');

  // Lấy danh sách customer để tạo orders sau này
  const allCustomers = await db.select().from(users).where(eq(users.role, 'customer'));

  // ── 4. Categories ──
  console.log('📂 Seeding categories…');
  await db.insert(categories).values([
    { name: 'Nhạc sống', slug: 'nhac-song', sortOrder: 1 },
    { name: 'EDM / DJ', slug: 'edm-dj', sortOrder: 2 },
    { name: 'Hài kịch', slug: 'hai-kich', sortOrder: 3 },
    { name: 'Thể thao', slug: 'the-thao', sortOrder: 4 },
    { name: 'Hội thảo', slug: 'hoi-thao', sortOrder: 5 },
    { name: 'Nhạc hội / Festival', slug: 'nhac-hoi', sortOrder: 6 },
    { name: 'Kịch / Sân khấu', slug: 'kich-san-khau', sortOrder: 7 },
    { name: 'Khác', slug: 'khac', sortOrder: 99 },
  ]);
  const allCategories = await db.select().from(categories);
  const catBySlug = Object.fromEntries(allCategories.map((c) => [c.slug, c.id]));
  console.log(`📂 ${allCategories.length} categories seeded`);

  // ── 5. Events (from seed-data.ts) ──
  const eventSeeds = getEventSeeds(admin.id, catBySlug);

  for (const eventSeed of eventSeeds) {
    const [ev] = await db.insert(events).values(eventSeed.values).returning();

    for (const show of eventSeed.shows) {
      await createShowWithSections(ev.id, show);
    }

    console.log(`🎪 Event: "${ev.title}" (${eventSeed.shows.length} shows)`);
  }

  // ── 6. Sample Orders ──
  console.log('🧾 Seeding orders…');

  const allUsers = await db.select().from(users).where(eq(users.role, 'customer'));
  const availableSeats = await db
    .select()
    .from(seats)
    .where(eq(seats.status, 'available'))
    .limit(15);

  const PRICE_PER_SEAT = 500000;
  const SEATS_PER_ORDER = 3;
  let seatIndex = 0;

  for (let i = 0; i < 5; i++) {
    const user = randPick(allUsers);
    const isPaid = i % 2 === 0;
    const pickedSeats = availableSeats.slice(seatIndex, seatIndex + SEATS_PER_ORDER);
    seatIndex += SEATS_PER_ORDER;

    if (pickedSeats.length === 0) break;

    const total = pickedSeats.length * PRICE_PER_SEAT;

    const [order] = await db
      .insert(orders)
      .values({
        userId: user.id,
        totalAmount: String(total),
        status: isPaid ? 'paid' : 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        paidAt: isPaid ? new Date() : null,
      })
      .returning();

    for (const s of pickedSeats) {
      const code = generateTicketCode();

      await db.insert(orderItems).values({
        orderId: order.id,
        seatId: s.id,
        priceSnapshot: String(PRICE_PER_SEAT),
        ticketCode: code,
        qrCode: code,
      });

      await db
        .update(seats)
        .set(
          isPaid
            ? { status: 'sold', lockedBy: null, lockedAt: null }
            : { status: 'locked', lockedBy: user.id, lockedAt: new Date() },
        )
        .where(eq(seats.id, s.id));
    }
  }

  console.log('🧾 Orders seeded: 5 orders × 3 items');

  // ── Summary ──
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('✅ Seed completed!');
  console.log('──────────────────────────────────────────');
  console.log(`  📂 ${allCategories.length} categories`);
  console.log('  👤 1 admin + 10 customers');
  console.log(`  🎪 ${eventSeeds.length} events`);
  console.log('  🧾 5 sample orders');
  console.log('══════════════════════════════════════════');
}

// ── Entry point ────────────────────────────────
if (import.meta.main) {
  seed()
    .then(() => {
      console.log('🏁 Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
