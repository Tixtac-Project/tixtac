import { db } from '$lib/server/db';
import { events, seatSections, seats, users } from '$lib/server/db/schema';

/**
 * Mock password-hashing helper used for development and testing.
 *
 * This function does not perform real cryptographic hashing; it returns a deterministic placeholder derived from the input.
 *
 * @param plain - The plaintext password to hash
 * @returns The mocked hashed string in the form `hashed_<plain>`
 */
async function hashPassword(plain: string): Promise<string> {
  return `hashed_${plain}`;
}

/**
 * Seed the development database with initial users, events, sections, and seats.
 *
 * Inserts an admin user and several customer users, creates two sample events
 * ("Rock Festival 2026" and "EDM Night Saigon"), and for each event creates
 * seat sections and generates seat rows/columns marked as available. Logs
 * progress and a summary of seeded seat counts.
 */
export async function seed() {
  console.log('🌱 Bắt đầu seed data...');

  // await db.delete(seats);
  // await db.delete(seatSections);
  // await db.delete(events);
  // await db.delete(users);

  // ── Admin ──
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

  // ── Event 1: Rock Festival ──
  const [event1] = await db
    .insert(events)
    .values({
      title: 'Rock Festival 2026',
      description: 'Đại nhạc hội rock lớn nhất năm với sự tham gia của các ban nhạc hàng đầu...',
      venue: 'Sân vận động Mỹ Đình, Hà Nội',
      eventDate: new Date('2026-06-15T19:00:00Z'),
      bannerImageUrl: 'https://picsum.photos/seed/rock/800/400',
      status: 'published',
      saleStartAt: new Date('2026-05-01T09:00:00Z'),
      createdBy: admin.id,
    })
    .returning();

  await createSections(event1.id, [
    { name: 'VIP', rows: 5, cols: 20, price: '2000000', sortOrder: 0 },
    { name: 'Standard', rows: 10, cols: 30, price: '500000', sortOrder: 1 },
  ]);

  // ── Event 2: EDM Night ──
  const [event2] = await db
    .insert(events)
    .values({
      title: 'EDM Night Saigon',
      description: 'Đêm nhạc điện tử sôi động nhất TP.HCM...',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      eventDate: new Date('2026-07-20T20:00:00Z'),
      bannerImageUrl: 'https://picsum.photos/seed/edm/800/400',
      status: 'published',
      saleStartAt: new Date('2026-06-01T09:00:00Z'),
      createdBy: admin.id,
    })
    .returning();

  await createSections(event2.id, [
    { name: 'Diamond', rows: 3, cols: 15, price: '3000000', sortOrder: 0 },
    { name: 'Gold', rows: 5, cols: 20, price: '1500000', sortOrder: 1 },
    { name: 'Silver', rows: 10, cols: 25, price: '700000', sortOrder: 2 },
  ]);

  console.log('✅ Seed completed!');
  console.log(`🎟️  Event 1: ${5 * 20 + 10 * 30} = 400 seats`);
  console.log(`🎟️  Event 2: ${3 * 15 + 5 * 20 + 10 * 25} = 395 seats`);
}

/**
 * Create seat sections for an event and insert the corresponding seat records.
 *
 * For each entry in `sections`, inserts a `seatSections` record for the given `eventId`
 * and batch-inserts the generated seats for that section with status `'available'`.
 *
 * @param eventId - The ID of the event to attach sections and seats to
 * @param sections - Array of section descriptors. Each descriptor must include:
 *   - `name`: section name
 *   - `rows`: number of seat rows (row labels start at "A")
 *   - `cols`: number of seats per row (columns numbered from 1)
 *   - `price`: price for the section
 *   - `sortOrder`: ordering index for the section
 */
async function createSections(
  eventId: number,
  sections: { name: string; rows: number; cols: number; price: string; sortOrder: number }[],
) {
  for (const s of sections) {
    const [section] = await db
      .insert(seatSections)
      .values({
        eventId,
        name: s.name,
        rows: s.rows,
        cols: s.cols,
        price: s.price,
        sortOrder: s.sortOrder,
      })
      .returning();

    // Sinh ma trận ghế
    const seatValues = [];
    for (let r = 0; r < s.rows; r++) {
      const rowLabel = String.fromCharCode(65 + r); // A, B, C, D,...
      for (let c = 1; c <= s.cols; c++) {
        seatValues.push({
          sectionId: section.id,
          eventId,
          rowLabel,
          colNumber: c,
          status: 'available' as const,
        });
      }
    }
    // Batch insert để tối ưu hiệu năng
    await db.insert(seats).values(seatValues);
  }
}

seed()
  .then(() => {
    console.log('🏁 Xong!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
