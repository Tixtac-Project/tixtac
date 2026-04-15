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
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';

// ── Types for Seed Data ────────────────────────
import type { SectionLayoutConfig, SectionSeatConfig } from '$lib/server/db/schema';

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
  type: 'assigned' | 'general';
  isSeatPickable: boolean;
  capacity: number;
  price: string;
  sortOrder: number;
  layoutConfig: SectionLayoutConfig;
  seatConfig: SectionSeatConfig;
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
        isSeatPickable: s.isSeatPickable,
        capacity: s.capacity,
        price: s.price,
        sortOrder: s.sortOrder,
        layoutConfig: s.layoutConfig,
        seatConfig: s.seatConfig,
        salesStartAt: s.salesStartAt || null,
        salesEndAt: s.salesEndAt || null,
      })
      .returning();

    const disabledSet = new Set(s.disabledSeats ?? []);
    const isGA = s.type === 'general';
    const seatCfg = s.seatConfig;

    // GA uses capacity only — no individual seat records
    if (isGA) continue;

    const seatValues = [];
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

        const label = `${prefixStr}${rowLabel}${colNumber}`;

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

    if (seatValues.length > 0) {
      for (let i = 0; i < seatValues.length; i += 1000) {
        await db.insert(seats).values(seatValues.slice(i, i + 1000));
      }
    }
  }

  return newShow;
}

// ══════════════════════════════════════════════════
// MAIN SEED
// ══════════════════════════════════════════════════

export async function seed() {
  console.log('🌱 Starting seed with new Schema…');

  // ── 1. Clean event-related data (FK order) ──
  console.log('🧹 Cleaning event data…');
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

  // ══════════════════════════════════════════════════════════════════════
  // EVENT 1 — Rock Festival 2026 (Canvas 1200×800)
  // Features: Multi-show (2 nights), Mixed assigned + GA, Itinerary
  // ══════════════════════════════════════════════════════════════════════
  const [ev1] = await db
    .insert(events)
    .values({
      categoryId: catBySlug['nhac-song'],
      title: 'Rock Festival 2026',
      description:
        '## Đại nhạc hội Rock lớn nhất năm\n\n' +
        'Với sự tham gia của **các ban nhạc hàng đầu** Việt Nam và quốc tế.\n\n' +
        '### Highlights\n' +
        '- 2 đêm diễn liên tiếp\n' +
        '- Hơn 20 nghệ sĩ\n' +
        '- Sân khấu hoành tráng với hệ thống LED 360°\n\n' +
        '> "The biggest rock show in Southeast Asia" — Rolling Stone Vietnam\n',
      termsAndConditions:
        '## Điều khoản tham dự\n\n' +
        '1. Vé đã mua **không hoàn, không đổi**.\n' +
        '2. Ban tổ chức có quyền từ chối phục vụ người sử dụng chất kích thích.\n' +
        '3. Trẻ em dưới 16 tuổi phải có người giám hộ đi kèm.\n' +
        '4. Không mang theo thức ăn, đồ uống từ bên ngoài.\n',
      venue: 'Sân vận động Mỹ Đình, Hà Nội',
      bannerImageUrl: 'https://picsum.photos/seed/rock2026/800/400',
      minAge: 16,
      maxTicketsPerUser: 4,
      mapConfig: { width: 1200, height: 800, gridSize: 20, snapToGrid: true },
      stageLayout: [
        {
          id: 'main',
          label: 'Main Stage',
          type: 'stage',
          x: 350,
          y: 20,
          w: 500,
          h: 120,
          rotation: 0,
        },
        {
          id: 'entrance',
          label: 'Lối vào chính',
          type: 'entrance',
          x: 550,
          y: 760,
          w: 100,
          h: 30,
          rotation: 0,
        },
      ],
      amenities: ['parking', 'wifi', 'food_court', 'atm', 'first_aid'],
      organizerInfo: {
        name: 'Rockstorm Entertainment',
        email: 'info@rockstorm.vn',
        phone: '1900-6868',
        website: 'https://rockstorm.vn',
      },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  const rockSections: SectionSeed[] = [
    {
      name: 'VIP - Trái',
      type: 'assigned',
      isSeatPickable: true,
      capacity: 0,
      price: '2000000',
      sortOrder: 0,
      layoutConfig: { x: 150, y: 200, width: 350, height: 160, rotation: 0, color: '#FFD700' },
      seatConfig: {
        rows: 5,
        cols: 12,
        prefix: 'VIPL',
        rowFormat: 'alphabetic',
        colDirection: 'ltr',
        startRowIndex: 1,
        startColIndex: 1,
      },
    },
    {
      name: 'VIP - Phải',
      type: 'assigned',
      isSeatPickable: true,
      capacity: 0,
      price: '2000000',
      sortOrder: 1,
      layoutConfig: { x: 700, y: 200, width: 350, height: 160, rotation: 0, color: '#FFD700' },
      seatConfig: {
        rows: 5,
        cols: 12,
        prefix: 'VIPR',
        rowFormat: 'alphabetic',
        colDirection: 'rtl',
        startRowIndex: 1,
        startColIndex: 1,
      },
    },
    {
      name: 'Standard A',
      type: 'assigned',
      isSeatPickable: true,
      capacity: 0,
      price: '800000',
      sortOrder: 2,
      layoutConfig: { x: 100, y: 420, width: 1000, height: 150, rotation: 0, color: '#4169E1' },
      seatConfig: {
        rows: 8,
        cols: 40,
        prefix: 'STA',
        rowFormat: 'alphabetic',
        colDirection: 'ltr',
        startRowIndex: 1,
        startColIndex: 1,
      },
    },
    {
      name: 'Standard B',
      type: 'assigned',
      isSeatPickable: false, // Auto-assign (no pick)
      capacity: 0,
      price: '500000',
      sortOrder: 3,
      layoutConfig: { x: 100, y: 590, width: 1000, height: 100, rotation: 0, color: '#6495ED' },
      seatConfig: {
        rows: 5,
        cols: 40,
        prefix: 'STB',
        rowFormat: 'numeric',
        colDirection: 'ltr',
        startRowIndex: 1,
        startColIndex: 1,
      },
    },
    {
      name: 'GA Standing',
      type: 'general',
      isSeatPickable: false,
      capacity: 2000,
      price: '300000',
      sortOrder: 4,
      layoutConfig: { x: 50, y: 710, width: 1100, height: 60, rotation: 0, color: '#32CD32' },
      seatConfig: {
        rows: 0,
        cols: 0,
        prefix: 'GA',
        rowFormat: 'alphabetic',
        colDirection: 'ltr',
        startRowIndex: 1,
        startColIndex: 1,
      },
    },
  ];

  // Night 1
  await createShowWithSections(ev1.id, {
    title: 'Night 1 — Opening Night',
    showDate: '2026-06-15',
    startTime: new Date('2026-06-15T19:00:00+07:00'),
    endTime: new Date('2026-06-15T23:30:00+07:00'),
    itinerary: [
      { time: '19:00', activity: 'Mở cửa', description: 'Check-in & giao lưu' },
      { time: '19:30', activity: 'Ban nhạc mở màn', description: 'Chất Rock thuần Việt' },
      { time: '20:30', activity: 'Nghệ sĩ khách mời quốc tế', description: '' },
      { time: '22:00', activity: 'Headliner', description: 'Bùi Anh Tuấn & Band' },
      { time: '23:00', activity: 'Encore & Kết thúc', description: '' },
    ],
    status: 'published',
    sections: rockSections,
  });

  // Night 2
  await createShowWithSections(ev1.id, {
    title: 'Night 2 — Grand Finale',
    showDate: '2026-06-16',
    startTime: new Date('2026-06-16T19:00:00+07:00'),
    endTime: new Date('2026-06-16T23:30:00+07:00'),
    itinerary: [
      { time: '19:00', activity: 'Mở cửa', description: '' },
      { time: '19:30', activity: 'DJ Warm-up', description: '' },
      { time: '20:00', activity: 'Rock Việt All-Stars', description: 'Dàn sao Rock hội tụ' },
      { time: '22:00', activity: 'International Headliner', description: 'Special Guest TBA' },
      { time: '23:00', activity: 'Fireworks & Close', description: 'Pháo hoa kết thúc' },
    ],
    status: 'published',
    sections: rockSections,
  });

  console.log(`🎸 Event 1: "${ev1.title}" — 2 nights, VIP+Standard+GA, RTL mirroring`);

  // ══════════════════════════════════════════════════════════════════════
  // EVENT 2 — EDM Night (Club Arena 800×800)
  // Features: Pillar obstacles, Cutout disabled seats, High startRowIndex
  // ══════════════════════════════════════════════════════════════════════
  const [ev2] = await db
    .insert(events)
    .values({
      categoryId: catBySlug['edm-dj'],
      title: 'EDM Night Saigon',
      description:
        '## Đêm nhạc điện tử sôi động nhất Sài Gòn\n\n' +
        'Line-up DJ hàng đầu châu Á. Hệ thống âm thanh **Funktion-One** đẳng cấp.\n\n' +
        '### Line-up\n' +
        '- DJ Hà Nội Connection\n' +
        '- SlimV\n' +
        '- International Guest: **Yellow Claw**\n',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      bannerImageUrl: 'https://picsum.photos/seed/edm2026/800/400',
      minAge: 18,
      maxTicketsPerUser: 2,
      mapConfig: { width: 800, height: 800, gridSize: 10, snapToGrid: true },
      stageLayout: [
        { id: 'dj', label: 'DJ Booth', type: 'stage', x: 300, y: 30, w: 200, h: 80, rotation: 0 },
        {
          id: 'pillar1',
          label: 'Cột trụ trái',
          type: 'obstacle',
          x: 195,
          y: 395,
          w: 40,
          h: 40,
          rotation: 0,
        },
        {
          id: 'pillar2',
          label: 'Cột trụ phải',
          type: 'obstacle',
          x: 555,
          y: 395,
          w: 40,
          h: 40,
          rotation: 0,
        },
        {
          id: 'bar',
          label: 'Quầy Bar',
          type: 'obstacle',
          x: 680,
          y: 200,
          w: 80,
          h: 200,
          rotation: 0,
        },
      ],
      amenities: ['bar', 'cloakroom', 'smoking_area'],
      organizerInfo: { name: 'Ravolution Music', email: 'hello@ravolution.vn' },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev2.id, {
    showDate: '2026-07-20',
    startTime: new Date('2026-07-20T20:00:00+07:00'),
    endTime: new Date('2026-07-21T02:00:00+07:00'),
    status: 'published',
    sections: [
      {
        name: 'Diamond Table',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '5000000',
        sortOrder: 0,
        layoutConfig: {
          x: 250,
          y: 150,
          width: 300,
          height: 120,
          rotation: 0,
          color: '#E5E4E2',
          zIndex: 10,
        },
        seatConfig: {
          rows: 3,
          cols: 10,
          prefix: 'DIA',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Gold - Trái',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '2000000',
        sortOrder: 1,
        layoutConfig: { x: 50, y: 320, width: 300, height: 200, rotation: 0, color: '#FFD700' },
        seatConfig: {
          rows: 8,
          cols: 15,
          prefix: 'GL',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
        // Cutouts around left pillar (pillar is at ~195,395 relative to section at 50,320)
        // Pillar covers approx rows F-G, cols 10-11
        disabledSeats: ['GL-F10', 'GL-F11', 'GL-G10', 'GL-G11'],
      },
      {
        name: 'Gold - Phải',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '2000000',
        sortOrder: 2,
        layoutConfig: { x: 420, y: 320, width: 300, height: 200, rotation: 0, color: '#FFD700' },
        seatConfig: {
          rows: 8,
          cols: 15,
          prefix: 'GR',
          rowFormat: 'alphabetic',
          colDirection: 'rtl',
          startRowIndex: 1,
          startColIndex: 1,
        },
        // Cutouts around right pillar
        disabledSeats: ['GR-F5', 'GR-F6', 'GR-G5', 'GR-G6'],
      },
      {
        name: 'GA Dance Floor',
        type: 'general',
        isSeatPickable: false,
        capacity: 800,
        price: '800000',
        sortOrder: 3,
        layoutConfig: { x: 100, y: 570, width: 600, height: 180, rotation: 0, color: '#FF1493' },
        seatConfig: {
          rows: 0,
          cols: 0,
          prefix: 'DF',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
    ],
  });

  console.log(`🎧 Event 2: "${ev2.title}" — Pillar cutouts, RTL Gold, zIndex`);

  // ══════════════════════════════════════════════════════════════════════
  // EVENT 3 — Stand-Up Comedy (Theater-in-the-round 1000×800)
  // Features: Center stage, Rotated wing blocks, RTL numbering, Non-snap grid
  // ══════════════════════════════════════════════════════════════════════
  const [ev3] = await db
    .insert(events)
    .values({
      categoryId: catBySlug['hai-kich'],
      title: 'Stand-Up Comedy Night',
      description:
        '## Đêm hài kịch đứng — Sân khấu 360°\n\n' +
        'Sân khấu vòng tròn giữa khán phòng, mỗi block xoay hướng về trung tâm.\n\n' +
        '### Nghệ sĩ\n' +
        '- Xuân Hinh\n' +
        '- Trấn Thành\n' +
        '- Thu Trang\n',
      venue: 'Galaxy Cinema Nguyễn Du, TP.HCM',
      bannerImageUrl: 'https://picsum.photos/seed/comedy2026/800/400',
      mapConfig: { width: 1000, height: 800, gridSize: 10, snapToGrid: false },
      stageLayout: [
        {
          id: 'center',
          label: 'Center Stage',
          type: 'circle',
          x: 450,
          y: 350,
          w: 160,
          h: 160,
          rotation: 0,
        },
      ],
      amenities: ['wheelchair', 'wifi'],
      organizerInfo: { name: 'Sài Gòn Comedy Club', phone: '028-9999-0000' },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev3.id, {
    title: 'Suất 20:00',
    showDate: '2026-09-05',
    startTime: new Date('2026-09-05T20:00:00+07:00'),
    endTime: new Date('2026-09-05T22:00:00+07:00'),
    status: 'published',
    sections: [
      {
        name: 'Front Row (Dưới)',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '1500000',
        sortOrder: 0,
        layoutConfig: { x: 300, y: 560, width: 400, height: 80, rotation: 0, color: '#FF4500' },
        seatConfig: {
          rows: 3,
          cols: 20,
          prefix: 'FR',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Front Row (Trên)',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '1500000',
        sortOrder: 1,
        layoutConfig: { x: 300, y: 130, width: 400, height: 80, rotation: 0, color: '#FF4500' },
        seatConfig: {
          rows: 3,
          cols: 20,
          prefix: 'FT',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Cánh Trái',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '800000',
        sortOrder: 2,
        layoutConfig: { x: 60, y: 250, width: 220, height: 260, rotation: 15, color: '#FFA500' },
        seatConfig: {
          rows: 8,
          cols: 10,
          prefix: 'LW',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Cánh Phải',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '800000',
        sortOrder: 3,
        layoutConfig: { x: 720, y: 250, width: 220, height: 260, rotation: -15, color: '#FFA500' },
        seatConfig: {
          rows: 8,
          cols: 10,
          prefix: 'RW',
          rowFormat: 'alphabetic',
          colDirection: 'rtl',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Balcony (Sau)',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '500000',
        sortOrder: 4,
        layoutConfig: { x: 200, y: 680, width: 600, height: 80, rotation: 0, color: '#9370DB' },
        seatConfig: {
          rows: 3,
          cols: 30,
          prefix: 'BAL',
          rowFormat: 'numeric',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
    ],
  });

  // Second show same night
  await createShowWithSections(ev3.id, {
    title: 'Suất 22:30 (Late Night)',
    showDate: '2026-09-05',
    startTime: new Date('2026-09-05T22:30:00+07:00'),
    endTime: new Date('2026-09-06T00:30:00+07:00'),
    status: 'published',
    sections: [
      {
        name: 'Front Row',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '1200000',
        sortOrder: 0,
        layoutConfig: { x: 300, y: 560, width: 400, height: 80, rotation: 0, color: '#FF4500' },
        seatConfig: {
          rows: 3,
          cols: 20,
          prefix: 'FR',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'GA Standing',
        type: 'general',
        isSeatPickable: false,
        capacity: 200,
        price: '400000',
        sortOrder: 1,
        layoutConfig: { x: 100, y: 250, width: 800, height: 260, rotation: 0, color: '#90EE90' },
        seatConfig: {
          rows: 0,
          cols: 0,
          prefix: 'GA',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
    ],
  });

  console.log(`😂 Event 3: "${ev3.title}" — 360° stage, rotated wings, 2 shows same night`);

  // ══════════════════════════════════════════════════════════════════════
  // EVENT 4 — Sunset Music Festival (Outdoor 1500×1000)
  // Features: All GA, Timed sales (Early Bird / Regular / Last Minute)
  // ══════════════════════════════════════════════════════════════════════
  const [ev4] = await db
    .insert(events)
    .values({
      categoryId: catBySlug['nhac-hoi'],
      title: 'Sunset Music Festival 2026',
      description:
        '## Festival ngoài trời bên bờ biển\n\n' +
        'Tất cả vé đứng tự do. 3 đợt bán vé:\n' +
        '- **Early Bird**: 01/06 – 31/07\n' +
        '- **Regular**: 01/08 – 30/09\n' +
        '- **Last Minute**: 01/10 – 11/10\n',
      venue: 'Bãi biển Mỹ Khê, Đà Nẵng',
      bannerImageUrl: 'https://picsum.photos/seed/sunset2026/800/400',
      minAge: 0,
      maxTicketsPerUser: 6,
      mapConfig: { width: 1500, height: 1000, gridSize: 50, snapToGrid: true },
      stageLayout: [
        {
          id: 'main',
          label: 'Main Stage',
          type: 'stage',
          x: 450,
          y: 50,
          w: 600,
          h: 150,
          rotation: 0,
        },
        {
          id: 'side',
          label: 'Side Stage',
          type: 'stage',
          x: 50,
          y: 400,
          w: 200,
          h: 100,
          rotation: 0,
        },
      ],
      amenities: ['parking', 'food_court', 'first_aid', 'camping', 'shuttle'],
      organizerInfo: { name: 'Viet Festival Corp', website: 'https://vietfest.vn' },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev4.id, {
    showDate: '2026-10-12',
    startTime: new Date('2026-10-12T15:00:00+07:00'),
    endTime: new Date('2026-10-12T23:00:00+07:00'),
    itinerary: [
      { time: '15:00', activity: 'Mở cửa & DJ warm-up', description: '' },
      { time: '16:00', activity: 'Side Stage Acts', description: 'Indie Bands' },
      { time: '18:00', activity: 'Sunset Session', description: 'Chill & Acoustic' },
      { time: '20:00', activity: 'Main Headliner', description: '' },
      { time: '22:00', activity: 'Closing DJ Set', description: 'Beach Party' },
    ],
    status: 'published',
    sections: [
      {
        name: 'Early Bird',
        type: 'general',
        isSeatPickable: false,
        capacity: 500,
        price: '600000',
        sortOrder: 0,
        layoutConfig: { x: 300, y: 300, width: 900, height: 200, rotation: 0, color: '#FF69B4' },
        seatConfig: {
          rows: 0,
          cols: 0,
          prefix: 'EB',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
        salesStartAt: new Date('2026-06-01T00:00:00+07:00'),
        salesEndAt: new Date('2026-07-31T23:59:59+07:00'),
      },
      {
        name: 'Regular',
        type: 'general',
        isSeatPickable: false,
        capacity: 2000,
        price: '1000000',
        sortOrder: 1,
        layoutConfig: { x: 200, y: 550, width: 1100, height: 200, rotation: 0, color: '#8A2BE2' },
        seatConfig: {
          rows: 0,
          cols: 0,
          prefix: 'REG',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
        salesStartAt: new Date('2026-08-01T00:00:00+07:00'),
        salesEndAt: new Date('2026-09-30T23:59:59+07:00'),
      },
      {
        name: 'Last Minute',
        type: 'general',
        isSeatPickable: false,
        capacity: 500,
        price: '1500000',
        sortOrder: 2,
        layoutConfig: { x: 200, y: 800, width: 1100, height: 150, rotation: 0, color: '#DC143C' },
        seatConfig: {
          rows: 0,
          cols: 0,
          prefix: 'LM',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
        salesStartAt: new Date('2026-10-01T00:00:00+07:00'),
        salesEndAt: new Date('2026-10-11T23:59:59+07:00'),
      },
    ],
  });

  console.log(`🌅 Event 4: "${ev4.title}" — All GA, 3-tier timed sales`);

  // ══════════════════════════════════════════════════════════════════════
  // EVENT 5 — Tech Conference (Wide Canvas 1600×600)
  // Features: Horizontal layout, Numeric rows, No-pick assigned, Organizer info
  // ══════════════════════════════════════════════════════════════════════
  const [ev5] = await db
    .insert(events)
    .values({
      categoryId: catBySlug['hoi-thao'],
      title: 'Vietnam Tech Summit 2026',
      description:
        '## Hội nghị Công nghệ Việt Nam 2026\n\n' +
        'Quy tụ hơn **500 chuyên gia** từ Google, Microsoft, VNG, FPT.\n\n' +
        '### Tracks\n' +
        '- AI & Machine Learning\n' +
        '- Cloud & DevOps\n' +
        '- Startup Pitch\n',
      termsAndConditions: '## Quy định\n\n1. Trang phục lịch sự.\n2. Không quay phim.\n',
      venue: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
      bannerImageUrl: 'https://picsum.photos/seed/techconf/800/400',
      minAge: 0,
      maxTicketsPerUser: 1,
      mapConfig: { width: 1600, height: 600, gridSize: 20, snapToGrid: true },
      stageLayout: [
        {
          id: 'podium',
          label: 'Sân khấu / Podium',
          type: 'stage',
          x: 600,
          y: 20,
          w: 400,
          h: 80,
          rotation: 0,
        },
        {
          id: 'screen_l',
          label: 'Màn hình trái',
          type: 'obstacle',
          x: 200,
          y: 20,
          w: 120,
          h: 60,
          rotation: 0,
        },
        {
          id: 'screen_r',
          label: 'Màn hình phải',
          type: 'obstacle',
          x: 1280,
          y: 20,
          w: 120,
          h: 60,
          rotation: 0,
        },
      ],
      amenities: ['wifi', 'coffee', 'networking_lounge', 'charging_station'],
      organizerInfo: {
        name: 'VietTech Foundation',
        email: 'summit@viettech.org',
        phone: '024-3333-4444',
        website: 'https://summit.viettech.org',
      },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  // Day 1
  await createShowWithSections(ev5.id, {
    title: 'Day 1 — AI & Cloud',
    showDate: '2026-11-20',
    startTime: new Date('2026-11-20T08:30:00+07:00'),
    endTime: new Date('2026-11-20T17:30:00+07:00'),
    itinerary: [
      { time: '08:30', activity: 'Check-in & Coffee', description: '' },
      { time: '09:00', activity: 'Keynote: AI in 2026', description: 'By Google Vietnam' },
      { time: '10:30', activity: 'Panel: Cloud Migration', description: '' },
      { time: '12:00', activity: 'Lunch Break', description: '' },
      { time: '13:30', activity: 'Workshop Sessions', description: 'Hands-on labs' },
      { time: '16:00', activity: 'Networking', description: '' },
    ],
    status: 'published',
    sections: [
      {
        name: 'VIP (Hàng đầu)',
        type: 'assigned',
        isSeatPickable: false, // Conference seating = no-pick
        capacity: 0,
        price: '3000000',
        sortOrder: 0,
        layoutConfig: { x: 400, y: 130, width: 800, height: 80, rotation: 0, color: '#B8860B' },
        seatConfig: {
          rows: 3,
          cols: 30,
          prefix: 'VIP',
          rowFormat: 'numeric',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Khối A (Trái)',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '1500000',
        sortOrder: 1,
        layoutConfig: { x: 50, y: 250, width: 700, height: 180, rotation: 0, color: '#4682B4' },
        seatConfig: {
          rows: 10,
          cols: 25,
          prefix: 'KA',
          rowFormat: 'numeric',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Khối B (Phải)',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '1500000',
        sortOrder: 2,
        layoutConfig: { x: 850, y: 250, width: 700, height: 180, rotation: 0, color: '#4682B4' },
        seatConfig: {
          rows: 10,
          cols: 25,
          prefix: 'KB',
          rowFormat: 'numeric',
          colDirection: 'rtl',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Khối C (Sau)',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '800000',
        sortOrder: 3,
        layoutConfig: { x: 200, y: 470, width: 1200, height: 100, rotation: 0, color: '#708090' },
        seatConfig: {
          rows: 5,
          cols: 50,
          prefix: 'KC',
          rowFormat: 'numeric',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
    ],
  });

  // Day 2
  await createShowWithSections(ev5.id, {
    title: 'Day 2 — Startup & DevOps',
    showDate: '2026-11-21',
    startTime: new Date('2026-11-21T08:30:00+07:00'),
    endTime: new Date('2026-11-21T17:00:00+07:00'),
    status: 'published',
    sections: [
      {
        name: 'VIP',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '3000000',
        sortOrder: 0,
        layoutConfig: { x: 400, y: 130, width: 800, height: 80, rotation: 0, color: '#B8860B' },
        seatConfig: {
          rows: 3,
          cols: 30,
          prefix: 'VIP',
          rowFormat: 'numeric',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'General',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '1000000',
        sortOrder: 1,
        layoutConfig: { x: 100, y: 250, width: 1400, height: 300, rotation: 0, color: '#4682B4' },
        seatConfig: {
          rows: 15,
          cols: 50,
          prefix: 'GEN',
          rowFormat: 'numeric',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
    ],
  });

  console.log(`💻 Event 5: "${ev5.title}" — Conference, numeric rows, no-pick, 2 days`);

  // ══════════════════════════════════════════════════════════════════════
  // EVENT 6 — Football Match (Stadium 1400×900)
  // Features: 4-sided stadium, High startRowIndex (tiered), Mixed GA+Assigned, Angled blocks
  // ══════════════════════════════════════════════════════════════════════
  const [ev6] = await db
    .insert(events)
    .values({
      categoryId: catBySlug['the-thao'],
      title: 'V-League: Hà Nội FC vs HAGL',
      description:
        '## Trận cầu đinh V-League 2026\n\n' +
        'Hà Nội FC tiếp đón Hoàng Anh Gia Lai tại Hàng Đẫy.\n\n' +
        '**Kick-off: 19:15**\n',
      venue: 'Sân Hàng Đẫy, Hà Nội',
      bannerImageUrl: 'https://picsum.photos/seed/vleague/800/400',
      minAge: 0,
      maxTicketsPerUser: 4,
      mapConfig: { width: 1400, height: 900, gridSize: 20, snapToGrid: true },
      stageLayout: [
        {
          id: 'pitch',
          label: 'Sân cỏ',
          type: 'stage',
          x: 350,
          y: 250,
          w: 700,
          h: 400,
          rotation: 0,
        },
      ],
      amenities: ['parking', 'food_court', 'first_aid', 'atm'],
      organizerInfo: { name: 'VPF - Vietnam Professional Football', website: 'https://vpf.vn' },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev6.id, {
    showDate: '2026-08-10',
    startTime: new Date('2026-08-10T19:15:00+07:00'),
    endTime: new Date('2026-08-10T21:15:00+07:00'),
    status: 'published',
    sections: [
      // Khán đài Đông (Main stand — bottom)
      {
        name: 'Khán đài Đông - VIP',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '500000',
        sortOrder: 0,
        layoutConfig: { x: 350, y: 680, width: 700, height: 80, rotation: 0, color: '#FFD700' },
        seatConfig: {
          rows: 4,
          cols: 35,
          prefix: 'EV',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Khán đài Đông - Thường',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '200000',
        sortOrder: 1,
        layoutConfig: { x: 350, y: 770, width: 700, height: 80, rotation: 0, color: '#4169E1' },
        seatConfig: {
          rows: 4,
          cols: 35,
          prefix: 'ES',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 5,
          startColIndex: 1,
        },
      },
      // Khán đài Tây (opposite side — top)
      {
        name: 'Khán đài Tây',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '150000',
        sortOrder: 2,
        layoutConfig: { x: 350, y: 50, width: 700, height: 160, rotation: 0, color: '#228B22' },
        seatConfig: {
          rows: 8,
          cols: 35,
          prefix: 'W',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      // Khán đài Nam (left end — rotated)
      {
        name: 'Khán đài Nam',
        type: 'general',
        isSeatPickable: false,
        capacity: 1500,
        price: '100000',
        sortOrder: 3,
        layoutConfig: { x: 100, y: 250, width: 200, height: 400, rotation: 0, color: '#FF6347' },
        seatConfig: {
          rows: 0,
          cols: 0,
          prefix: 'S',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      // Khán đài Bắc (right end — rotated)
      {
        name: 'Khán đài Bắc',
        type: 'general',
        isSeatPickable: false,
        capacity: 1500,
        price: '100000',
        sortOrder: 4,
        layoutConfig: { x: 1100, y: 250, width: 200, height: 400, rotation: 0, color: '#FF6347' },
        seatConfig: {
          rows: 0,
          cols: 0,
          prefix: 'N',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
    ],
  });

  console.log(`⚽ Event 6: "${ev6.title}" — Stadium 4-side, high startRowIndex, GA ends`);

  // ══════════════════════════════════════════════════════════════════════
  // EVENT 7 — Theater Play (Classic 800×600)
  // Features: Draft status, Balcony + Orchestra, Alphabetic rows starting from row F, Detailed cutouts
  // ══════════════════════════════════════════════════════════════════════
  const [ev7] = await db
    .insert(events)
    .values({
      categoryId: catBySlug['kich-san-khau'],
      title: 'Vở kịch: Tấm Cám — Phiên bản mới',
      description:
        '## Tấm Cám — Broadway Style\n\n' +
        'Phiên bản hiện đại của câu chuyện cổ tích kinh điển.\n\n' +
        '- Đạo diễn: NSƯT Thành Lộc\n' +
        '- Thiết kế sân khấu: Sỹ Hoàng\n',
      venue: 'Nhà hát Lớn Hà Nội',
      bannerImageUrl: 'https://picsum.photos/seed/theater2026/800/400',
      mapConfig: { width: 800, height: 600, gridSize: 10, snapToGrid: true },
      stageLayout: [
        {
          id: 'stage',
          label: 'Sân khấu',
          type: 'stage',
          x: 150,
          y: 10,
          w: 500,
          h: 100,
          rotation: 0,
        },
        {
          id: 'orchestra_pit',
          label: 'Hố nhạc',
          type: 'obstacle',
          x: 200,
          y: 110,
          w: 400,
          h: 40,
          rotation: 0,
        },
      ],
      amenities: ['cloakroom', 'wheelchair', 'cafe'],
      organizerInfo: { name: 'Nhà hát Kịch Việt Nam', phone: '024-3825-1234' },
      status: 'draft', // Still in draft!
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev7.id, {
    title: 'Preview Night',
    showDate: '2026-12-20',
    startTime: new Date('2026-12-20T19:30:00+07:00'),
    endTime: new Date('2026-12-20T21:30:00+07:00'),
    status: 'draft',
    sections: [
      {
        name: 'Orchestra',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '1200000',
        sortOrder: 0,
        layoutConfig: { x: 100, y: 170, width: 600, height: 150, rotation: 0, color: '#8B0000' },
        seatConfig: {
          rows: 8,
          cols: 25,
          prefix: 'ORC',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
        // Aisle cutouts (center aisle at col 13)
        disabledSeats: [
          'ORC-A13',
          'ORC-B13',
          'ORC-C13',
          'ORC-D13',
          'ORC-E13',
          'ORC-F13',
          'ORC-G13',
          'ORC-H13',
        ],
      },
      {
        name: 'Mezzanine',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '800000',
        sortOrder: 1,
        layoutConfig: { x: 100, y: 350, width: 600, height: 100, rotation: 0, color: '#CD853F' },
        seatConfig: {
          rows: 5,
          cols: 25,
          prefix: 'MEZ',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 9,
          startColIndex: 1, // Continues from Orchestra (I, J, K...)
        },
      },
      {
        name: 'Balcony',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '400000',
        sortOrder: 2,
        layoutConfig: { x: 50, y: 480, width: 700, height: 80, rotation: 0, color: '#696969' },
        seatConfig: {
          rows: 4,
          cols: 30,
          prefix: 'BAL',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 14,
          startColIndex: 1, // N, O, P, Q
        },
        // Corner cutouts (irregular balcony shape)
        disabledSeats: [
          'BAL-N1',
          'BAL-N2',
          'BAL-N29',
          'BAL-N30',
          'BAL-O1',
          'BAL-O30',
          'BAL-Q1',
          'BAL-Q2',
          'BAL-Q3',
          'BAL-Q28',
          'BAL-Q29',
          'BAL-Q30',
        ],
      },
    ],
  });

  await createShowWithSections(ev7.id, {
    title: 'Opening Night',
    showDate: '2026-12-25',
    startTime: new Date('2026-12-25T19:30:00+07:00'),
    endTime: new Date('2026-12-25T21:30:00+07:00'),
    status: 'draft',
    sections: [
      {
        name: 'Orchestra',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '1500000', // Higher price for opening night
        sortOrder: 0,
        layoutConfig: { x: 100, y: 170, width: 600, height: 150, rotation: 0, color: '#8B0000' },
        seatConfig: {
          rows: 8,
          cols: 25,
          prefix: 'ORC',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
        disabledSeats: [
          'ORC-A13',
          'ORC-B13',
          'ORC-C13',
          'ORC-D13',
          'ORC-E13',
          'ORC-F13',
          'ORC-G13',
          'ORC-H13',
        ],
      },
      {
        name: 'Mezzanine',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '1000000',
        sortOrder: 1,
        layoutConfig: { x: 100, y: 350, width: 600, height: 100, rotation: 0, color: '#CD853F' },
        seatConfig: {
          rows: 5,
          cols: 25,
          prefix: 'MEZ',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 9,
          startColIndex: 1,
        },
      },
      {
        name: 'Balcony',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '500000',
        sortOrder: 2,
        layoutConfig: { x: 50, y: 480, width: 700, height: 80, rotation: 0, color: '#696969' },
        seatConfig: {
          rows: 4,
          cols: 30,
          prefix: 'BAL',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 14,
          startColIndex: 1,
        },
        disabledSeats: [
          'BAL-N1',
          'BAL-N2',
          'BAL-N29',
          'BAL-N30',
          'BAL-O1',
          'BAL-O30',
          'BAL-Q1',
          'BAL-Q2',
          'BAL-Q3',
          'BAL-Q28',
          'BAL-Q29',
          'BAL-Q30',
        ],
      },
    ],
  });

  console.log(`🎭 Event 7: "${ev7.title}" — Draft, tiered rows (A→Q), aisle+corner cutouts`);

  // ══════════════════════════════════════════════════════════════════════
  // EVENT 8 — Boxing Match (Compact Arena 600×600)
  // Features: Tiny canvas, High-price ringside, Steep rotation, Mixed pricing tiers
  // ══════════════════════════════════════════════════════════════════════
  const [ev8] = await db
    .insert(events)
    .values({
      categoryId: catBySlug['the-thao'],
      title: 'WBO Asia Pacific — Trần Văn Thảo vs Park Joo-young',
      description:
        '## Trận tranh đai WBO Asia Pacific\n\n' +
        'Võ sĩ Trần Văn Thảo bảo vệ đai trước đối thủ Hàn Quốc.\n\n' +
        '**Undercard bắt đầu từ 18:00**\n',
      venue: 'Nhà thi đấu Nguyễn Du, TP.HCM',
      bannerImageUrl: 'https://picsum.photos/seed/boxing2026/800/400',
      minAge: 16,
      maxTicketsPerUser: 2,
      mapConfig: { width: 600, height: 600, gridSize: 10, snapToGrid: true },
      stageLayout: [
        {
          id: 'ring',
          label: 'Võ đài',
          type: 'stage',
          x: 225,
          y: 225,
          w: 150,
          h: 150,
          rotation: 45,
        },
      ],
      amenities: ['parking', 'food_court', 'first_aid'],
      organizerInfo: { name: 'VSP Boxing Promotion', email: 'vsp@boxing.vn' },
      status: 'published',
      createdBy: admin.id,
    })
    .returning();

  await createShowWithSections(ev8.id, {
    showDate: '2026-09-28',
    startTime: new Date('2026-09-28T18:00:00+07:00'),
    endTime: new Date('2026-09-28T22:00:00+07:00'),
    itinerary: [
      { time: '18:00', activity: 'Undercard Bout 1', description: '' },
      { time: '18:45', activity: 'Undercard Bout 2', description: '' },
      { time: '19:30', activity: 'Undercard Bout 3', description: '' },
      {
        time: '20:30',
        activity: 'Main Event',
        description: 'Trần Văn Thảo vs Park Joo-young — 12 Rounds',
      },
    ],
    status: 'published',
    sections: [
      // Ringside — 4 angled blocks surrounding the ring
      {
        name: 'Ringside - Trước',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '5000000',
        sortOrder: 0,
        layoutConfig: { x: 175, y: 400, width: 250, height: 60, rotation: 0, color: '#DC143C' },
        seatConfig: {
          rows: 2,
          cols: 12,
          prefix: 'RSF',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Ringside - Sau',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '5000000',
        sortOrder: 1,
        layoutConfig: { x: 175, y: 140, width: 250, height: 60, rotation: 0, color: '#DC143C' },
        seatConfig: {
          rows: 2,
          cols: 12,
          prefix: 'RSB',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Ringside - Trái',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '4000000',
        sortOrder: 2,
        layoutConfig: { x: 50, y: 200, width: 80, height: 200, rotation: 0, color: '#B22222' },
        seatConfig: {
          rows: 8,
          cols: 3,
          prefix: 'RSL',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      {
        name: 'Ringside - Phải',
        type: 'assigned',
        isSeatPickable: true,
        capacity: 0,
        price: '4000000',
        sortOrder: 3,
        layoutConfig: { x: 470, y: 200, width: 80, height: 200, rotation: 0, color: '#B22222' },
        seatConfig: {
          rows: 8,
          cols: 3,
          prefix: 'RSR',
          rowFormat: 'alphabetic',
          colDirection: 'rtl',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
      // Upper tiers — angled corner blocks
      {
        name: 'Góc Trái-Trước',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '2000000',
        sortOrder: 4,
        layoutConfig: { x: 30, y: 420, width: 120, height: 120, rotation: 25, color: '#FF8C00' },
        seatConfig: {
          rows: 5,
          cols: 5,
          prefix: 'CLF',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
        // Corner cutout (remove the far corner seat)
        disabledSeats: ['CLF-E5', 'CLF-E4', 'CLF-D5'],
      },
      {
        name: 'Góc Phải-Trước',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '2000000',
        sortOrder: 5,
        layoutConfig: { x: 450, y: 420, width: 120, height: 120, rotation: -25, color: '#FF8C00' },
        seatConfig: {
          rows: 5,
          cols: 5,
          prefix: 'CRF',
          rowFormat: 'alphabetic',
          colDirection: 'rtl',
          startRowIndex: 1,
          startColIndex: 1,
        },
        disabledSeats: ['CRF-E1', 'CRF-E2', 'CRF-D1'],
      },
      {
        name: 'Góc Trái-Sau',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '2000000',
        sortOrder: 6,
        layoutConfig: { x: 30, y: 60, width: 120, height: 120, rotation: -25, color: '#FF8C00' },
        seatConfig: {
          rows: 5,
          cols: 5,
          prefix: 'CLB',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
        disabledSeats: ['CLB-A5', 'CLB-A4', 'CLB-B5'],
      },
      {
        name: 'Góc Phải-Sau',
        type: 'assigned',
        isSeatPickable: false,
        capacity: 0,
        price: '2000000',
        sortOrder: 7,
        layoutConfig: { x: 450, y: 60, width: 120, height: 120, rotation: 25, color: '#FF8C00' },
        seatConfig: {
          rows: 5,
          cols: 5,
          prefix: 'CRB',
          rowFormat: 'alphabetic',
          colDirection: 'rtl',
          startRowIndex: 1,
          startColIndex: 1,
        },
        disabledSeats: ['CRB-A1', 'CRB-A2', 'CRB-B1'],
      },
      // GA standing at the very back
      {
        name: 'GA Standing',
        type: 'general',
        isSeatPickable: false,
        capacity: 300,
        price: '500000',
        sortOrder: 8,
        layoutConfig: { x: 50, y: 500, width: 500, height: 60, rotation: 0, color: '#2E8B57' },
        seatConfig: {
          rows: 0,
          cols: 0,
          prefix: 'GA',
          rowFormat: 'alphabetic',
          colDirection: 'ltr',
          startRowIndex: 1,
          startColIndex: 1,
        },
      },
    ],
  });

  console.log(`🥊 Event 8: "${ev8.title}" — Compact arena, 4-corner rotated blocks, ringside`);

  console.log('🧾 Seeding orders...');

  const allUsers = await db.select().from(users).where(eq(users.role, 'customer'));

  const allSeats = await db.select().from(seats).limit(200); // lấy 200 ghế đầu để test

  let seatIndex = 0;

  for (let i = 0; i < 5; i++) {
    const user = randPick(allUsers);

    const pickedSeats = allSeats.slice(seatIndex, seatIndex + 3);
    seatIndex += 3;

    const total = pickedSeats.reduce((sum) => sum + 500000, 0);

    const [order] = await db
      .insert(orders)
      .values({
        userId: user.id,
        totalAmount: String(total),
        status: i % 2 === 0 ? 'paid' : 'pending',
        expiresAt:
          i % 2 === 0
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 24 * 60 * 60 * 1000),
        paidAt: i % 2 === 0 ? new Date() : null,
      })
      .returning();

    for (const s of pickedSeats) {
      const code = `TIX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      await db.insert(orderItems).values({
        orderId: order.id,
        seatId: s.id,
        priceSnapshot: '500000',
        ticketCode: code,
        qrCode: code,
        isCheckedIn: false,
        checkedInAt: null,
      });

      // mark seat sold
      await db
        .update(seats)
        .set(
          i % 2 === 0
            ? { status: 'sold', lockedBy: null, lockedAt: null }
            : { status: 'locked', lockedBy: user.id, lockedAt: new Date() },
        )
        .where(eq(seats.id, s.id));
    }
  }

  console.log('🧾 Orders seeded: 5 orders × 3 items');

  // ── Summary ────────────────────────────────
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('✅ Seed completed! Summary:');
  console.log('──────────────────────────────────────────');
  console.log('  📂 8 categories');
  console.log('  👤 1 admin + 10 customers');
  console.log('  🎪 8 events across 7 categories');
  console.log('  📅 15 shows total');
  console.log('  🎯 Features covered:');
  console.log('     • Multi-show (2-night, same-day)');
  console.log('     • Assigned + GA sections');
  console.log('     • RTL col direction');
  console.log('     • Rotated blocks (±15°, ±25°, 45°)');
  console.log('     • Disabled seats (pillar cutouts, aisle, corners)');
  console.log('     • Timed sales (Early Bird / Regular / Last Minute)');
  console.log('     • Numeric + Alphabetic row formats');
  console.log('     • No-pick (auto-assign) sections');
  console.log('     • High startRowIndex (tiered theaters)');
  console.log('     • zIndex layering');
  console.log('     • Draft + Published statuses');
  console.log('     • Various canvas sizes (600→1600)');
  console.log('     • Rich Markdown, Itineraries, Organizer Info, Amenities');
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
