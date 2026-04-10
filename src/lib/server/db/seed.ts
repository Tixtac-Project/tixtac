// src/lib/server/db/seed.ts
import { db } from '$lib/server/db';
import { events, orderItems, orders, seatSections, seats, users } from '$lib/server/db/schema';
import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';

// ── Helpers ────────────────────────────────────

/**
 * Hash a plaintext password using argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, { type: argon2.argon2id });
}

/**
 * Convert a 0-based index to a row label.
 * 0→A, 1→B, 25→Z, 26→AA, 27→AB
 */
function getRowLabel(index: number): string {
  let label = '';
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

// ── Types ──────────────────────────────────────

interface SectionSeed {
  name: string;
  prefix: string;
  rows: number;
  cols: number;
  price: string;
  layoutX: number;
  layoutY: number;
  startRowIndex: number;
  startColIndex: number;
  sortOrder: number;
  disabledSeats?: string[];
}

// ── Seed ───────────────────────────────────────

/**
 * Seed the development database with initial users, events, sections, and seats.
 *
 * Cleans all existing data first (FK-safe order), then inserts:
 * - 1 admin + 5 customers
 * - Event 1: "Rock Festival 2026" — VIP split Left/Right + Standard (flex layout demo)
 * - Event 2: "EDM Night Saigon" — 3 sections with disabled seats demo
 */
export async function seed() {
  console.log('🌱 Bắt đầu seed data...');

  // ════════════════════════════════════════════
  // 🧹 Cleanup — xóa data cũ theo thứ tự FK (con → cha)
  // ════════════════════════════════════════════
  console.log('🧹 Cleaning existing data...');
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(seats);
  await db.delete(seatSections);
  await db.delete(events);
  await db.delete(users);

  // Reset auto-increment sequences để ID bắt đầu từ 1
  await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE events_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE seat_sections_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE seats_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE orders_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE order_items_id_seq RESTART WITH 1`);

  // ── Admin ──────────────────────────────────
  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@tixtac.io.vn',
      passwordHash: await hashPassword('123456'),
      fullName: 'Admin Tixtac',
      dateOfBirth: '1990-01-15',
      gender: 'male',
      role: 'admin',
    })
    .returning();

  // ── Customers (đa dạng tuổi + giới tính cho demographics) ──
  const customerData = [
    { email: 'alice@gmail.com', name: 'Nguyễn Thị A', dob: '2000-03-20', gender: 'female' },
    { email: 'bob@gmail.com', name: 'Trần Văn B', dob: '1998-07-10', gender: 'male' },
    { email: 'charlie@gmail.com', name: 'Lê Văn C', dob: '2002-11-05', gender: 'male' },
    { email: 'diana@gmail.com', name: 'Phạm Thị D', dob: '1995-09-25', gender: 'female' },
    { email: 'eve@gmail.com', name: 'Hoàng E', dob: '2001-01-30', gender: 'other' },
  ] as const;

  for (const c of customerData) {
    await db.insert(users).values({
      email: c.email,
      passwordHash: await hashPassword('123456'),
      fullName: c.name,
      dateOfBirth: c.dob,
      gender: c.gender,
      role: 'customer',
    });
  }

  // ── Event 1: Rock Festival — VIP chia Trái/Phải + Standard ──
  // Demo: flex layout với lối đi giữa 2 block VIP
  //
  // [SÂN KHẤU]
  //
  // VIP-Trái (A1–A5)   [lối đi]   VIP-Phải (A6–A10)
  // VIP-Trái (B1–B5)   [lối đi]   VIP-Phải (B6–B10)
  // VIP-Trái (C1–C5)   [lối đi]   VIP-Phải (C6–C10)
  //
  // Standard (D1–D20)
  // ...
  // Standard (M1–M20)

  const [event1] = await db
    .insert(events)
    .values({
      title: 'Rock Festival 2026',
      description: 'Đại nhạc hội rock lớn nhất năm với sự tham gia của các ban nhạc hàng đầu...',
      venue: 'Sân vận động Mỹ Đình, Hà Nội',
      eventDate: new Date('2026-06-15T19:00:00Z'),
      bannerImageUrl: 'https://picsum.photos/seed/rock/800/400',
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createSections(event1.id, [
    {
      name: 'VIP - Trái',
      prefix: 'VIPL',
      rows: 3,
      cols: 5,
      price: '2000000',
      layoutX: 0,
      layoutY: 100,
      startRowIndex: 0, // A
      startColIndex: 1, // 1–5
      sortOrder: 0,
    },
    {
      name: 'VIP - Phải',
      prefix: 'VIPR',
      rows: 3,
      cols: 5,
      price: '2000000',
      layoutX: 80, // Cách block trái → tạo lối đi
      layoutY: 100, // Cùng hàng ngang
      startRowIndex: 0, // Vẫn A
      startColIndex: 6, // 6–10 → liền mạch với bên trái
      sortOrder: 1,
    },
    {
      name: 'Standard',
      prefix: 'STD',
      rows: 10,
      cols: 20,
      price: '500000',
      layoutX: 0,
      layoutY: 250, // Phía sau VIP
      startRowIndex: 3, // D (nối tiếp sau hàng C của VIP)
      startColIndex: 1,
      sortOrder: 2,
    },
  ]);

  const event1TotalSeats = 3 * 5 + 3 * 5 + 10 * 20; // 230

  // ── Event 2: EDM Night — Có disabled seats ──
  // Demo: ghế bị vô hiệu hóa do cột chắn tầm nhìn
  //
  // Diamond:  A1–A15 (hàng đầu, không bị chắn)
  //           B1–B15 (B8 disabled — cột chắn)
  //           C1–C15 (C8 disabled — cột chắn)
  //
  // Gold:     D1–D20
  // ...
  // Silver:   I1–I25
  // ...

  const [event2] = await db
    .insert(events)
    .values({
      title: 'EDM Night Saigon',
      description: 'Đêm nhạc điện tử sôi động nhất TP.HCM...',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      eventDate: new Date('2026-07-20T20:00:00Z'),
      bannerImageUrl: 'https://picsum.photos/seed/edm/800/400',
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createSections(event2.id, [
    {
      name: 'Diamond',
      prefix: 'DIA',
      rows: 3,
      cols: 15,
      price: '3000000',
      layoutX: 0,
      layoutY: 50,
      startRowIndex: 0, // A
      startColIndex: 1,
      sortOrder: 0,
      disabledSeats: ['DIA-B8', 'DIA-C8'], // Cột chắn tầm nhìn
    },
    {
      name: 'Gold',
      prefix: 'GOLD',
      rows: 5,
      cols: 20,
      price: '1500000',
      layoutX: 0,
      layoutY: 180,
      startRowIndex: 3, // D (nối tiếp Diamond)
      startColIndex: 1,
      sortOrder: 1,
    },
    {
      name: 'Silver',
      prefix: 'SIL',
      rows: 10,
      cols: 25,
      price: '700000',
      layoutX: 0,
      layoutY: 380,
      startRowIndex: 8, // I (nối tiếp Gold)
      startColIndex: 1,
      sortOrder: 2,
      disabledSeats: ['SIL-I13', 'SIL-J13', 'SIL-K13'], // Cột chắn giữa Silver
    },
  ]);

  const event2DisabledCount = 2 + 3; // Diamond: 2, Silver: 3
  const event2TotalSeats = 3 * 15 + 5 * 20 + 10 * 25; // 395 total grid
  const event2AvailableSeats = event2TotalSeats - event2DisabledCount; // 390 available

  // ── Summary ────────────────────────────────
  console.log('✅ Seed completed!');
  console.log(`🎟️  Event 1: "${event1.title}" — ${event1TotalSeats} seats (VIP split Left/Right)`);
  console.log(
    `🎟️  Event 2: "${event2.title}" — ${event2AvailableSeats} available + ${event2DisabledCount} disabled = ${event2TotalSeats} total`,
  );
}

/**
 * Create seat sections for an event and insert the corresponding seat records.
 *
 * Supports flex seat layout:
 * - `layoutX`/`layoutY`: position on the canvas (grid units)
 * - `startRowIndex`/`startColIndex`: offset for row/col numbering
 * - `disabledSeats`: array of seat labels (e.g. "B4") to mark as disabled
 *
 * Seats are batch-inserted in chunks of 1000 for performance.
 */
async function createSections(eventId: number, sections: SectionSeed[]) {
  for (const s of sections) {
    const [section] = await db
      .insert(seatSections)
      .values({
        eventId,
        name: s.name,
        prefix: s.prefix,
        rows: s.rows,
        cols: s.cols,
        price: s.price,
        layoutX: s.layoutX,
        layoutY: s.layoutY,
        startRowIndex: s.startRowIndex,
        startColIndex: s.startColIndex,
        sortOrder: s.sortOrder,
      })
      .returning();

    // Sinh ma trận ghế với offset + disabled support
    const disabledSet = new Set(s.disabledSeats ?? []);
    const seatValues = [];

    for (let r = 0; r < s.rows; r++) {
      const rowLabel = getRowLabel(s.startRowIndex + r);

      for (let c = 0; c < s.cols; c++) {
        const colNumber = s.startColIndex + c;
        const label = `${s.prefix}-${rowLabel}${colNumber}`;

        seatValues.push({
          sectionId: section.id,
          eventId,
          prefix: s.prefix,
          rowLabel,
          colNumber,
          status: disabledSet.has(label) ? ('disabled' as const) : ('available' as const),
        });
      }
    }

    // Batch insert (chunk 1000) để tối ưu hiệu năng
    for (let i = 0; i < seatValues.length; i += 1000) {
      await db.insert(seats).values(seatValues.slice(i, i + 1000));
    }
  }
}

// ── Entry point ────────────────────────────────
if (import.meta.main) {
  seed()
    .then(() => {
      console.log('🏁 Xong!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
