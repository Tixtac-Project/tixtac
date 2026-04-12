// src/lib/server/db/seed.ts
import { db } from '$lib/server/db';
import { events, orderItems, orders, seatSections, seats, users } from '$lib/server/db/schema';
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

// ── Section Seed Type ──────────────────────────

interface SectionSeed {
  name: string;
  prefix: string;
  type: 'assigned' | 'general';
  isSeatPickable: boolean;
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

// ── Seat generation ────────────────────────────

async function createSections(eventId: number, sections: SectionSeed[]) {
  for (const s of sections) {
    const [section] = await db
      .insert(seatSections)
      .values({
        eventId,
        name: s.name,
        prefix: s.prefix,
        type: s.type,
        isSeatPickable: s.isSeatPickable,
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

    for (let i = 0; i < seatValues.length; i += 1000) {
      await db.insert(seats).values(seatValues.slice(i, i + 1000));
    }
  }
}

// ══════════════════════════════════════════════════
// MAIN SEED
// ══════════════════════════════════════════════════

export async function seed() {
  console.log('🌱 Starting seed…');

  // ── 1. Clean event-related data (FK order) ──
  console.log('🧹 Cleaning event data…');
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(seats);
  await db.delete(seatSections);
  await db.delete(events);

  // ── 2. Admin — upsert (skip if exists) ──
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

  console.log(`👤 Admin: ${admin.email} (id=${admin.id})`);

  // ── 3. 10 Random Customers — skip existing ──
  const customerPwHash = await hashPassword('12345678');
  for (let i = 1; i <= 10; i++) {
    const u = generateUser(i);
    await db
      .insert(users)
      .values({
        email: u.email,
        passwordHash: customerPwHash,
        fullName: u.fullName,
        dateOfBirth: u.dateOfBirth,
        gender: u.gender,
        phone: u.phone,
        role: 'customer',
      })
      .onConflictDoNothing({ target: users.email });
  }
  console.log('👥 10 random customers seeded');

  // ══════════════════════════════════════════════
  // EVENT 1 — Rock Festival · Stadium · Published
  // Assigned pickable VIP split L/R + Standard + GA standing
  // ══════════════════════════════════════════════
  const [ev1] = await db
    .insert(events)
    .values({
      title: 'Rock Festival 2026',
      description: 'Đại nhạc hội rock lớn nhất năm với sự tham gia của các ban nhạc hàng đầu.',
      venue: 'Sân vận động Mỹ Đình, Hà Nội',
      eventDate: new Date('2026-06-15T19:00:00+07:00'),
      bannerImageUrl: 'https://picsum.photos/seed/rock/800/400',
      minAge: 16,
      maxTicketsPerUser: 4,
      stageLayout: [{ id: 'main', label: 'Main Stage', type: 'rect', x: 5, y: 0, w: 20, h: 4 }],
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createSections(ev1.id, [
    {
      name: 'VIP - Trái',
      prefix: 'VIPL',
      type: 'assigned',
      isSeatPickable: true,
      rows: 5,
      cols: 10,
      price: '2000000',
      layoutX: 0,
      layoutY: 6,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 0,
    },
    {
      name: 'VIP - Phải',
      prefix: 'VIPR',
      type: 'assigned',
      isSeatPickable: true,
      rows: 5,
      cols: 10,
      price: '2000000',
      layoutX: 15,
      layoutY: 6,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 1,
    },
    {
      name: 'Standard',
      prefix: 'STD',
      type: 'assigned',
      isSeatPickable: true,
      rows: 15,
      cols: 30,
      price: '500000',
      layoutX: 0,
      layoutY: 12,
      startRowIndex: 5,
      startColIndex: 1,
      sortOrder: 2,
    },
    {
      name: 'GA Standing',
      prefix: 'GA',
      type: 'general',
      isSeatPickable: false,
      rows: 200,
      cols: 1,
      price: '300000',
      layoutX: 0,
      layoutY: 28,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 3,
    },
  ]);

  console.log(`🎸 Event 1: "${ev1.title}" — VIP L/R + Standard + GA`);

  // ══════════════════════════════════════════════
  // EVENT 2 — EDM Night · Arena · Published
  // Assigned pickable Diamond/Gold/Silver + disabled seats
  // ══════════════════════════════════════════════
  const [ev2] = await db
    .insert(events)
    .values({
      title: 'EDM Night Saigon',
      description: 'Đêm nhạc điện tử sôi động nhất TP.HCM với DJ quốc tế.',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      eventDate: new Date('2026-07-20T20:00:00+07:00'),
      bannerImageUrl: 'https://picsum.photos/seed/edm/800/400',
      minAge: 18,
      maxTicketsPerUser: 6,
      stageLayout: [
        { id: 'main', label: 'DJ Booth', type: 'rect', x: 8, y: 0, w: 14, h: 3 },
        { id: 'catwalk', label: 'Catwalk', type: 'rect', x: 14, y: 3, w: 2, h: 8 },
      ],
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createSections(ev2.id, [
    {
      name: 'Diamond',
      prefix: 'DIA',
      type: 'assigned',
      isSeatPickable: true,
      rows: 3,
      cols: 15,
      price: '3000000',
      layoutX: 0,
      layoutY: 5,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 0,
      disabledSeats: ['DIA-B8', 'DIA-C8'],
    },
    {
      name: 'Gold',
      prefix: 'GOLD',
      type: 'assigned',
      isSeatPickable: true,
      rows: 5,
      cols: 20,
      price: '1500000',
      layoutX: 0,
      layoutY: 9,
      startRowIndex: 3,
      startColIndex: 1,
      sortOrder: 1,
    },
    {
      name: 'Silver',
      prefix: 'SIL',
      type: 'assigned',
      isSeatPickable: true,
      rows: 10,
      cols: 25,
      price: '700000',
      layoutX: 0,
      layoutY: 15,
      startRowIndex: 8,
      startColIndex: 1,
      sortOrder: 2,
      disabledSeats: ['SIL-I13', 'SIL-J13', 'SIL-K13'],
    },
  ]);

  console.log(`🎧 Event 2: "${ev2.title}" — Diamond/Gold/Silver with disabled seats`);

  // ══════════════════════════════════════════════
  // EVENT 3 — Acoustic Night · Small venue · Published
  // Non-pickable assigned (system assigns seats)
  // ══════════════════════════════════════════════
  const [ev3] = await db
    .insert(events)
    .values({
      title: 'Acoustic Intimate Night',
      description:
        'Đêm nhạc acoustic ấm cúng với các nghệ sĩ indie nổi tiếng. Ghế được hệ thống tự phân bổ theo thứ tự.',
      venue: 'Nhà hát nhỏ, 22 Hai Bà Trưng, Hà Nội',
      eventDate: new Date('2026-08-10T19:30:00+07:00'),
      bannerImageUrl: 'https://picsum.photos/seed/acoustic/800/400',
      minAge: 0,
      maxTicketsPerUser: 2,
      stageLayout: [{ id: 'stage', label: 'Sân khấu', type: 'rect', x: 2, y: 0, w: 8, h: 3 }],
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createSections(ev3.id, [
    {
      name: 'Premium',
      prefix: 'PRM',
      type: 'assigned',
      isSeatPickable: false,
      rows: 5,
      cols: 12,
      price: '800000',
      layoutX: 0,
      layoutY: 4,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 0,
    },
    {
      name: 'Regular',
      prefix: 'REG',
      type: 'assigned',
      isSeatPickable: false,
      rows: 8,
      cols: 12,
      price: '400000',
      layoutX: 0,
      layoutY: 10,
      startRowIndex: 5,
      startColIndex: 1,
      sortOrder: 1,
    },
  ]);

  console.log(`🎵 Event 3: "${ev3.title}" — Non-pickable assigned seating`);

  // ══════════════════════════════════════════════
  // EVENT 4 — Comedy Show · Theater · Published
  // Center stage (circle) + L-shaped seating
  // ══════════════════════════════════════════════
  const [ev4] = await db
    .insert(events)
    .values({
      title: 'Stand-Up Comedy Night',
      description:
        'Đêm hài kịch đứng với 5 nghệ sĩ hài nổi tiếng. Sân khấu vòng tròn giữa khán phòng.',
      venue: 'Galaxy Cinema Nguyễn Du, TP.HCM',
      eventDate: new Date('2026-09-05T20:00:00+07:00'),
      bannerImageUrl: 'https://picsum.photos/seed/comedy/800/400',
      minAge: 16,
      maxTicketsPerUser: 4,
      stageLayout: [
        { id: 'center', label: 'Center Stage', type: 'circle', x: 12, y: 12, radius: 3 },
      ],
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createSections(ev4.id, [
    {
      name: 'Front Row',
      prefix: 'FR',
      type: 'assigned',
      isSeatPickable: true,
      rows: 3,
      cols: 20,
      price: '1200000',
      layoutX: 0,
      layoutY: 0,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 0,
    },
    {
      name: 'Left Wing',
      prefix: 'LW',
      type: 'assigned',
      isSeatPickable: true,
      rows: 8,
      cols: 8,
      price: '800000',
      layoutX: 0,
      layoutY: 4,
      startRowIndex: 3,
      startColIndex: 1,
      sortOrder: 1,
    },
    {
      name: 'Right Wing',
      prefix: 'RW',
      type: 'assigned',
      isSeatPickable: true,
      rows: 8,
      cols: 8,
      price: '800000',
      layoutX: 16,
      layoutY: 4,
      startRowIndex: 3,
      startColIndex: 1,
      sortOrder: 2,
    },
    {
      name: 'Back',
      prefix: 'BK',
      type: 'assigned',
      isSeatPickable: true,
      rows: 5,
      cols: 20,
      price: '500000',
      layoutX: 0,
      layoutY: 13,
      startRowIndex: 11,
      startColIndex: 1,
      sortOrder: 3,
    },
  ]);

  console.log(`😂 Event 4: "${ev4.title}" — Circle stage + L-shaped seating`);

  // ══════════════════════════════════════════════
  // EVENT 5 — Music Festival · Outdoor · Draft
  // Multiple stages + all GA (standing only)
  // ══════════════════════════════════════════════
  const [ev5] = await db
    .insert(events)
    .values({
      title: 'Sunset Music Festival 2026',
      description: 'Festival ngoài trời 2 ngày với 3 sân khấu song song. Tất cả vé đứng tự do.',
      venue: 'Bãi biển Mỹ Khê, Đà Nẵng',
      eventDate: new Date('2026-10-12T15:00:00+07:00'),
      bannerImageUrl: 'https://picsum.photos/seed/sunset/800/400',
      minAge: 18,
      maxTicketsPerUser: 2,
      stageLayout: [
        { id: 'main', label: 'Main Stage', type: 'rect', x: 0, y: 0, w: 20, h: 5 },
        { id: 'second', label: 'Second Stage', type: 'rect', x: 25, y: 0, w: 12, h: 4 },
        { id: 'chill', label: 'Chill Zone', type: 'circle', x: 40, y: 5, radius: 5 },
      ],
      status: 'draft',
      createdBy: admin.id,
    })
    .returning();

  await createSections(ev5.id, [
    {
      name: 'Early Bird',
      prefix: 'EB',
      type: 'general',
      isSeatPickable: false,
      rows: 500,
      cols: 1,
      price: '800000',
      layoutX: 0,
      layoutY: 6,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 0,
    },
    {
      name: 'Regular',
      prefix: 'RG',
      type: 'general',
      isSeatPickable: false,
      rows: 1500,
      cols: 1,
      price: '1200000',
      layoutX: 0,
      layoutY: 7,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 1,
    },
    {
      name: 'VIP Lounge',
      prefix: 'VIPL',
      type: 'general',
      isSeatPickable: false,
      rows: 100,
      cols: 1,
      price: '3500000',
      layoutX: 0,
      layoutY: 8,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 2,
    },
  ]);

  console.log(`🌅 Event 5: "${ev5.title}" — All-GA outdoor festival (draft)`);

  // ══════════════════════════════════════════════
  // EVENT 6 — K-Pop Concert · Large arena · Published
  // Runway stage + mixed assigned/GA
  // ══════════════════════════════════════════════
  const [ev6] = await db
    .insert(events)
    .values({
      title: 'K-Pop Super Live 2026',
      description: 'Đêm nhạc K-Pop hoành tráng với sân khấu đường băng xuyên giữa khán đài.',
      venue: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
      eventDate: new Date('2026-11-22T18:00:00+07:00'),
      bannerImageUrl: 'https://picsum.photos/seed/kpop/800/400',
      minAge: 0,
      maxTicketsPerUser: 4,
      stageLayout: [
        { id: 'main', label: 'Main Stage', type: 'rect', x: 5, y: 0, w: 30, h: 5 },
        { id: 'runway', label: 'Runway', type: 'rect', x: 18, y: 5, w: 4, h: 15 },
        { id: 'bstage', label: 'B-Stage', type: 'circle', x: 20, y: 22, radius: 4 },
      ],
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createSections(ev6.id, [
    {
      name: 'VVIP',
      prefix: 'VVIP',
      type: 'assigned',
      isSeatPickable: true,
      rows: 3,
      cols: 15,
      price: '5000000',
      layoutX: 0,
      layoutY: 6,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 0,
    },
    {
      name: 'VIP - Left',
      prefix: 'VL',
      type: 'assigned',
      isSeatPickable: true,
      rows: 8,
      cols: 15,
      price: '3000000',
      layoutX: 0,
      layoutY: 10,
      startRowIndex: 3,
      startColIndex: 1,
      sortOrder: 1,
    },
    {
      name: 'VIP - Right',
      prefix: 'VR',
      type: 'assigned',
      isSeatPickable: true,
      rows: 8,
      cols: 15,
      price: '3000000',
      layoutX: 22,
      layoutY: 10,
      startRowIndex: 3,
      startColIndex: 1,
      sortOrder: 2,
    },
    {
      name: 'Standard - Left',
      prefix: 'SL',
      type: 'assigned',
      isSeatPickable: false,
      rows: 12,
      cols: 20,
      price: '1500000',
      layoutX: 0,
      layoutY: 19,
      startRowIndex: 11,
      startColIndex: 1,
      sortOrder: 3,
    },
    {
      name: 'Standard - Right',
      prefix: 'SR',
      type: 'assigned',
      isSeatPickable: false,
      rows: 12,
      cols: 20,
      price: '1500000',
      layoutX: 22,
      layoutY: 19,
      startRowIndex: 11,
      startColIndex: 1,
      sortOrder: 4,
    },
    {
      name: 'GA Floor',
      prefix: 'GAF',
      type: 'general',
      isSeatPickable: false,
      rows: 500,
      cols: 1,
      price: '800000',
      layoutX: 0,
      layoutY: 32,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 5,
    },
  ]);

  console.log(`🎤 Event 6: "${ev6.title}" — Runway stage + mixed assigned/GA`);

  // ── Summary ────────────────────────────────
  console.log('');
  console.log('✅ Seed completed!');
  console.log('  Events: 6 (5 published, 1 draft)');
  console.log('  Users: 1 admin + 10 customers');
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
