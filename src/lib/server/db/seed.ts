// src/lib/server/db/seed.ts
import { db } from '$lib/server/db';
import {
  events,
  eventShows,
  orderItems,
  orders,
  seats,
  seatSections,
  users,
} from '$lib/server/db/schema';
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
  capacity: number;
  price: string;
  layoutX: number;
  layoutY: number;
  startRowIndex: number;
  startColIndex: number;
  sortOrder: number;
  disabledSeats?: string[];
  salesStartAt?: Date;
  salesEndAt?: Date;
}

interface ShowSeed {
  title?: string | null;
  showDate: string;
  startTime: Date;
  endTime?: Date;
  itinerary?: { time: string; activity: string; description: string }[];
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  sections: SectionSeed[];
}

// ── Seat generation ────────────────────────────

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
        prefix: s.prefix,
        type: s.type,
        isSeatPickable: s.isSeatPickable,
        rows: s.rows,
        cols: s.cols,
        capacity: s.capacity,
        price: s.price,
        layoutX: s.layoutX,
        layoutY: s.layoutY,
        startRowIndex: s.startRowIndex,
        startColIndex: s.startColIndex,
        sortOrder: s.sortOrder,
        salesStartAt: s.salesStartAt || null,
        salesEndAt: s.salesEndAt || null,
      })
      .returning();

    const disabledSet = new Set(s.disabledSeats ?? []);
    const isGA = s.type === 'general';
    const effectiveRows = isGA ? s.capacity : s.rows;
    const effectiveCols = isGA ? 1 : s.cols;
    const seatValues = [];

    for (let r = 0; r < effectiveRows; r++) {
      const rowLabel = isGA ? '' : getRowLabel(s.startRowIndex + r);
      for (let c = 0; c < effectiveCols; c++) {
        const colNumber = isGA ? r + 1 : s.startColIndex + c;
        const label = isGA ? `${s.prefix}-${r + 1}` : `${s.prefix}-${rowLabel}${colNumber}`;
        seatValues.push({
          sectionId: section.id,
          showId: newShow.id,
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

  return newShow;
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
  await db.delete(eventShows);
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
  // EVENT 1 — Rock Festival 2026 · 2-Day Multi-Show · Published
  // Day 1 & Day 2 with independent seating
  // ══════════════════════════════════════════════
  const [ev1] = await db
    .insert(events)
    .values({
      title: 'Rock Festival 2026',
      description:
        '## Đại nhạc hội Rock lớn nhất năm\n\n' +
        'Với sự tham gia của **các ban nhạc hàng đầu** Việt Nam và quốc tế.\n\n' +
        '### Highlights\n' +
        '- 2 đêm diễn liên tiếp\n' +
        '- Hơn 20 nghệ sĩ\n' +
        '- Sân khấu hoành tráng\n',
      termsAndConditions:
        '## Điều khoản tham dự\n\n' +
        '1. Vé đã mua **không hoàn, không đổi**.\n' +
        '2. Ban tổ chức có quyền từ chối phục vụ người sử dụng chất kích thích.\n' +
        '3. Trẻ em dưới 16 tuổi phải có người giám hộ đi kèm.\n',
      venue: 'Sân vận động Mỹ Đình, Hà Nội',
      bannerImageUrl: 'https://picsum.photos/seed/rock/800/400',
      staticMapImageUrl: null,
      minAge: 16,
      maxTicketsPerUser: 4,
      stageLayout: [{ id: 'main', label: 'Main Stage', type: 'rect', x: 5, y: 0, w: 20, h: 4 }],
      amenities: ['parking', 'wifi', 'f-and-b', 'restroom', 'first-aid'],
      organizerInfo: {
        name: 'TixTac Entertainment',
        email: 'contact@tixtac.io.vn',
        phone: '+84 28 1234 5678',
        website: 'https://tixtac.io.vn',
      },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  // Day 1 sections
  const day1Sections: SectionSeed[] = [
    {
      name: 'VIP - Trái',
      prefix: 'VIPL',
      type: 'assigned',
      isSeatPickable: true,
      rows: 5,
      cols: 10,
      capacity: 0,
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
      capacity: 0,
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
      capacity: 0,
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
      rows: 0,
      cols: 0,
      capacity: 200,
      price: '300000',
      layoutX: 0,
      layoutY: 28,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 3,
    },
  ];

  await createShowWithSections(ev1.id, {
    title: 'Day 1 — Opening Night',
    showDate: '2026-06-15',
    startTime: new Date('2026-06-15T19:00:00+07:00'),
    endTime: new Date('2026-06-15T23:00:00+07:00'),
    itinerary: [
      { time: '18:00', activity: 'Mở cửa', description: 'Check-in và nhận vòng tay' },
      { time: '19:00', activity: 'DJ Warm-up', description: 'DJ khách mời' },
      { time: '20:00', activity: 'Band 1', description: 'Ngọt' },
      { time: '21:00', activity: 'Band 2', description: 'Cá Hồi Hoang' },
      { time: '22:00', activity: 'Headliner', description: 'Đen Vâu' },
      { time: '23:00', activity: 'Kết thúc', description: '' },
    ],
    status: 'published',
    sections: day1Sections,
  });

  // Day 2 sections (same layout, cloned)
  await createShowWithSections(ev1.id, {
    title: 'Day 2 — Grand Finale',
    showDate: '2026-06-16',
    startTime: new Date('2026-06-16T19:00:00+07:00'),
    endTime: new Date('2026-06-16T23:30:00+07:00'),
    itinerary: [
      { time: '18:00', activity: 'Mở cửa', description: 'Check-in và nhận vòng tay' },
      { time: '19:00', activity: 'DJ Set', description: 'DJ Hoaprox' },
      { time: '20:00', activity: 'Band 3', description: 'Chillies' },
      { time: '21:00', activity: 'Band 4', description: 'Da LAB' },
      { time: '22:00', activity: 'Grand Finale', description: 'Sơn Tùng M-TP' },
      { time: '23:30', activity: 'Kết thúc', description: '' },
    ],
    status: 'published',
    sections: day1Sections,
  });

  console.log(`🎸 Event 1: "${ev1.title}" — 2-day festival, VIP L/R + Standard + GA`);

  // ══════════════════════════════════════════════
  // EVENT 2 — EDM Night · Arena · Published · Single Show
  // Assigned pickable Diamond/Gold/Silver + disabled seats
  // ══════════════════════════════════════════════
  const [ev2] = await db
    .insert(events)
    .values({
      title: 'EDM Night Saigon',
      description:
        '## Đêm nhạc điện tử sôi động nhất TP.HCM\n\n' +
        'Với sự góp mặt của **DJ quốc tế** và dàn âm thanh *đỉnh cao*.\n',
      termsAndConditions: null,
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      bannerImageUrl: 'https://picsum.photos/seed/edm/800/400',
      minAge: 18,
      maxTicketsPerUser: 6,
      stageLayout: [
        { id: 'main', label: 'DJ Booth', type: 'rect', x: 8, y: 0, w: 14, h: 3 },
        { id: 'catwalk', label: 'Catwalk', type: 'rect', x: 14, y: 3, w: 2, h: 8 },
      ],
      amenities: ['parking', 'f-and-b', 'restroom'],
      organizerInfo: {
        name: 'Ravolution Music',
        email: 'info@ravolution.vn',
      },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev2.id, {
    title: null,
    showDate: '2026-07-20',
    startTime: new Date('2026-07-20T20:00:00+07:00'),
    endTime: new Date('2026-07-21T02:00:00+07:00'),
    itinerary: [
      { time: '19:00', activity: 'Mở cửa', description: '' },
      { time: '20:00', activity: 'DJ Set 1', description: 'Local DJs' },
      { time: '22:00', activity: 'Main Act', description: 'DJ quốc tế' },
      { time: '01:00', activity: 'Closing Set', description: '' },
    ],
    status: 'published',
    sections: [
      {
        name: 'Diamond',
        prefix: 'DIA',
        type: 'assigned',
        isSeatPickable: true,
        rows: 3,
        cols: 15,
        capacity: 0,
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
        capacity: 0,
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
        capacity: 0,
        price: '700000',
        layoutX: 0,
        layoutY: 15,
        startRowIndex: 8,
        startColIndex: 1,
        sortOrder: 2,
        disabledSeats: ['SIL-I13', 'SIL-J13', 'SIL-K13'],
      },
    ],
  });

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
        '## Đêm nhạc acoustic ấm cúng\n\n' +
        'Với các nghệ sĩ indie nổi tiếng. Ghế được hệ thống **tự phân bổ** theo thứ tự.\n',
      venue: 'Nhà hát nhỏ, 22 Hai Bà Trưng, Hà Nội',
      bannerImageUrl: 'https://picsum.photos/seed/acoustic/800/400',
      minAge: 0,
      maxTicketsPerUser: 2,
      stageLayout: [{ id: 'stage', label: 'Sân khấu', type: 'rect', x: 2, y: 0, w: 8, h: 3 }],
      amenities: ['wifi', 'f-and-b'],
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev3.id, {
    showDate: '2026-08-10',
    startTime: new Date('2026-08-10T19:30:00+07:00'),
    endTime: new Date('2026-08-10T22:00:00+07:00'),
    status: 'published',
    sections: [
      {
        name: 'Premium',
        prefix: 'PRM',
        type: 'assigned',
        isSeatPickable: false,
        rows: 5,
        cols: 12,
        capacity: 0,
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
        capacity: 0,
        price: '400000',
        layoutX: 0,
        layoutY: 10,
        startRowIndex: 5,
        startColIndex: 1,
        sortOrder: 1,
      },
    ],
  });

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
        '## Đêm hài kịch đứng\n\n' +
        'Với **5 nghệ sĩ hài** nổi tiếng. Sân khấu vòng tròn giữa khán phòng.\n',
      venue: 'Galaxy Cinema Nguyễn Du, TP.HCM',
      bannerImageUrl: 'https://picsum.photos/seed/comedy/800/400',
      minAge: 16,
      maxTicketsPerUser: 4,
      stageLayout: [
        { id: 'center', label: 'Center Stage', type: 'circle', x: 12, y: 12, radius: 3 },
      ],
      amenities: ['parking', 'f-and-b', 'restroom'],
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev4.id, {
    showDate: '2026-09-05',
    startTime: new Date('2026-09-05T20:00:00+07:00'),
    endTime: new Date('2026-09-05T22:30:00+07:00'),
    itinerary: [
      { time: '19:30', activity: 'Mở cửa', description: '' },
      { time: '20:00', activity: 'MC giới thiệu', description: '' },
      { time: '20:10', activity: 'Nghệ sĩ 1-3', description: 'Mỗi người 20 phút' },
      { time: '21:10', activity: 'Giải lao', description: '15 phút' },
      { time: '21:25', activity: 'Nghệ sĩ 4-5', description: 'Mỗi người 25 phút' },
      { time: '22:15', activity: 'Q&A', description: '' },
      { time: '22:30', activity: 'Kết thúc', description: '' },
    ],
    status: 'published',
    sections: [
      {
        name: 'Front Row',
        prefix: 'FR',
        type: 'assigned',
        isSeatPickable: true,
        rows: 3,
        cols: 20,
        capacity: 0,
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
        capacity: 0,
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
        capacity: 0,
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
        capacity: 0,
        price: '500000',
        layoutX: 0,
        layoutY: 13,
        startRowIndex: 11,
        startColIndex: 1,
        sortOrder: 3,
      },
    ],
  });

  console.log(`😂 Event 4: "${ev4.title}" — Circle stage + L-shaped seating`);

  // ══════════════════════════════════════════════
  // EVENT 5 — Music Festival · Outdoor · Draft
  // Multiple stages + all GA (standing only) + sales timing
  // ══════════════════════════════════════════════
  const [ev5] = await db
    .insert(events)
    .values({
      title: 'Sunset Music Festival 2026',
      description:
        '## Festival ngoài trời 2 ngày\n\n' +
        'Với **3 sân khấu** song song. Tất cả vé đứng tự do.\n\n' +
        '### Lưu ý\n' +
        '- Mang theo nón, kem chống nắng\n' +
        '- Không mang đồ ăn từ bên ngoài\n',
      termsAndConditions:
        '## Điều khoản\n\n' +
        '1. Vé Early Bird không được đổi sang hạng khác.\n' +
        '2. Trong trường hợp thời tiết xấu, BTC sẽ thông báo trước 24h.\n',
      venue: 'Bãi biển Mỹ Khê, Đà Nẵng',
      bannerImageUrl: 'https://picsum.photos/seed/sunset/800/400',
      staticMapImageUrl: 'https://picsum.photos/seed/sunset-map/600/400',
      minAge: 18,
      maxTicketsPerUser: 2,
      stageLayout: [
        { id: 'main', label: 'Main Stage', type: 'rect', x: 0, y: 0, w: 20, h: 5 },
        { id: 'second', label: 'Second Stage', type: 'rect', x: 25, y: 0, w: 12, h: 4 },
        { id: 'chill', label: 'Chill Zone', type: 'circle', x: 40, y: 5, radius: 5 },
      ],
      amenities: ['parking', 'wifi', 'f-and-b', 'restroom', 'first-aid', 'atm'],
      organizerInfo: {
        name: 'Sunset Events Co.',
        email: 'hello@sunsetfest.vn',
        phone: '+84 236 999 8888',
        website: 'https://sunsetfest.vn',
      },
      status: 'draft',
      createdBy: admin.id,
    })
    .returning();

  const gaSections: SectionSeed[] = [
    {
      name: 'Early Bird',
      prefix: 'EB',
      type: 'general',
      isSeatPickable: false,
      rows: 0,
      cols: 0,
      capacity: 500,
      price: '800000',
      layoutX: 0,
      layoutY: 6,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 0,
      salesStartAt: new Date('2026-06-01T00:00:00+07:00'),
      salesEndAt: new Date('2026-07-31T23:59:59+07:00'),
    },
    {
      name: 'Regular',
      prefix: 'RG',
      type: 'general',
      isSeatPickable: false,
      rows: 0,
      cols: 0,
      capacity: 1500,
      price: '1200000',
      layoutX: 0,
      layoutY: 7,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 1,
      salesStartAt: new Date('2026-08-01T00:00:00+07:00'),
      salesEndAt: new Date('2026-10-11T23:59:59+07:00'),
    },
    {
      name: 'VIP Lounge',
      prefix: 'VIPL',
      type: 'general',
      isSeatPickable: false,
      rows: 0,
      cols: 0,
      capacity: 100,
      price: '3500000',
      layoutX: 0,
      layoutY: 8,
      startRowIndex: 0,
      startColIndex: 1,
      sortOrder: 2,
    },
  ];

  await createShowWithSections(ev5.id, {
    title: 'Day 1 — Sunset Sessions',
    showDate: '2026-10-12',
    startTime: new Date('2026-10-12T15:00:00+07:00'),
    endTime: new Date('2026-10-12T23:00:00+07:00'),
    itinerary: [
      { time: '14:00', activity: 'Mở cửa', description: '' },
      { time: '15:00', activity: 'Warm Up', description: 'Local acts' },
      { time: '18:00', activity: 'Sunset Set', description: 'DJ hoàng hôn' },
      { time: '21:00', activity: 'Headliner', description: '' },
      { time: '23:00', activity: 'Kết thúc Day 1', description: '' },
    ],
    status: 'draft',
    sections: gaSections,
  });

  await createShowWithSections(ev5.id, {
    title: 'Day 2 — Grand Finale',
    showDate: '2026-10-13',
    startTime: new Date('2026-10-13T15:00:00+07:00'),
    endTime: new Date('2026-10-13T23:30:00+07:00'),
    itinerary: [
      { time: '14:00', activity: 'Mở cửa', description: '' },
      { time: '15:00', activity: 'Warm Up', description: '' },
      { time: '18:00', activity: 'Special Guest', description: '' },
      { time: '21:00', activity: 'Grand Finale Set', description: '' },
      { time: '23:30', activity: 'Kết thúc Festival', description: '' },
    ],
    status: 'draft',
    sections: gaSections,
  });

  console.log(
    `🌅 Event 5: "${ev5.title}" — 2-day all-GA outdoor festival (draft) with sales timing`,
  );

  // ══════════════════════════════════════════════
  // EVENT 6 — K-Pop Concert · Large arena · Published
  // Runway stage + mixed assigned/GA · Single show
  // ══════════════════════════════════════════════
  const [ev6] = await db
    .insert(events)
    .values({
      title: 'K-Pop Super Live 2026',
      description:
        '## Đêm nhạc K-Pop hoành tráng\n\n' +
        'Sân khấu đường băng xuyên giữa khán đài. **Lần đầu tiên** tại Việt Nam!\n',
      venue: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
      bannerImageUrl: 'https://picsum.photos/seed/kpop/800/400',
      minAge: 0,
      maxTicketsPerUser: 4,
      stageLayout: [
        { id: 'main', label: 'Main Stage', type: 'rect', x: 5, y: 0, w: 30, h: 5 },
        { id: 'runway', label: 'Runway', type: 'rect', x: 18, y: 5, w: 4, h: 15 },
        { id: 'bstage', label: 'B-Stage', type: 'circle', x: 20, y: 22, radius: 4 },
      ],
      amenities: ['parking', 'wifi', 'f-and-b', 'restroom', 'merch-booth'],
      organizerInfo: {
        name: 'K-Entertainment VN',
        email: 'kpop@entertainment.vn',
      },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev6.id, {
    showDate: '2026-11-22',
    startTime: new Date('2026-11-22T18:00:00+07:00'),
    endTime: new Date('2026-11-22T22:00:00+07:00'),
    itinerary: [
      { time: '17:00', activity: 'Mở cửa', description: 'Check-in & nhận lightstick' },
      { time: '18:00', activity: 'Opening VCR', description: '' },
      { time: '18:15', activity: 'Performance Block 1', description: '5 bài' },
      { time: '19:00', activity: 'Talk Session', description: '' },
      { time: '19:20', activity: 'Performance Block 2', description: '5 bài' },
      { time: '20:15', activity: 'Game & Fan Interaction', description: '' },
      { time: '20:45', activity: 'Performance Block 3', description: '5 bài + Encore' },
      { time: '22:00', activity: 'Ending', description: '' },
    ],
    status: 'published',
    sections: [
      {
        name: 'VVIP',
        prefix: 'VVIP',
        type: 'assigned',
        isSeatPickable: true,
        rows: 3,
        cols: 15,
        capacity: 0,
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
        capacity: 0,
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
        capacity: 0,
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
        capacity: 0,
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
        capacity: 0,
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
        rows: 0,
        cols: 0,
        capacity: 500,
        price: '800000',
        layoutX: 0,
        layoutY: 32,
        startRowIndex: 0,
        startColIndex: 1,
        sortOrder: 5,
      },
    ],
  });

  console.log(`🎤 Event 6: "${ev6.title}" — Runway stage + mixed assigned/GA`);

  // ── Summary ────────────────────────────────
  console.log('');
  console.log('✅ Seed completed!');
  console.log('  Events: 6 (5 published, 1 draft)');
  console.log('  Shows: 9 total (2+1+1+1+2+1 = 8 shows, Events 1 & 5 have 2 days each)');
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
