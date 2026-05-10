// scripts/backfill-order-items.ts
import { eq } from 'drizzle-orm';
import { generateCheckinSecret, hashCheckinSecret } from '../src/lib/server/checkin-secret';
import { db } from '../src/lib/server/db';
import { eventShows, orderItems, seats } from '../src/lib/server/db/schema';

const MAX_RETRIES_PER_ITEM = 5;

async function backfillOrderItems() {
  console.log('🔍 Fetching order items that need backfill...');

  // Lấy tất cả order_items hiện có (có thể đã có event_id hay chưa)
  const rows = await db
    .select({
      id: orderItems.id,
      seatId: orderItems.seatId,
      // event_id và show_id hiện tại (nếu đã có)
      eventId: orderItems.eventId,
      showId: orderItems.showId,
      // checkin_secret hiện tại (nếu đã có)
      checkinSecret: orderItems.checkinSecret,
    })
    .from(orderItems);

  console.log(`Found ${rows.length} total order items.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    // Kiểm tra nếu đã có đủ cả 4 trường thì bỏ qua
    if (
      row.eventId !== null &&
      row.showId !== null &&
      row.checkinSecret !== null &&
      row.checkinSecret !== '' // tránh trường hợp rỗng
    ) {
      skippedCount++;
      continue;
    }

    // Xác định event_id & show_id từ seat nếu chưa có
    let eventId = row.eventId;
    let showId = row.showId;

    if (eventId === null || showId === null) {
      const seatData = await db
        .select({
          showId: seats.showId,
          eventId: eventShows.eventId,
        })
        .from(seats)
        .innerJoin(eventShows, eq(seats.showId, eventShows.id))
        .where(eq(seats.id, row.seatId))
        .limit(1);

      if (seatData.length === 0) {
        console.error(`❌ Seat ${row.seatId} not found for order item ${row.id}. Skipping.`);
        continue;
      }

      eventId = seatData[0].eventId;
      showId = seatData[0].showId;
    }

    // Sinh checkin_secret và hash với retry
    let success = false;
    for (let attempt = 0; attempt < MAX_RETRIES_PER_ITEM; attempt++) {
      const secret = generateCheckinSecret();
      const secretHash = hashCheckinSecret(secret);

      try {
        await db
          .update(orderItems)
          .set({
            eventId: eventId!,
            showId: showId!,
            checkinSecret: secret,
            checkinSecretHash: secretHash,
          })
          .where(eq(orderItems.id, row.id));

        success = true;
        updatedCount++;
        break; // thành công
      } catch (err: unknown) {
        if (err instanceof Error && (err as { code?: string }).code === '23505') {
          // Unique violation – retry
          console.warn(
            `⚠️  Collision for order item ${row.id}, attempt ${attempt + 1}, retrying...`,
          );
          continue;
        }
        throw err;
      }
    }

    if (!success) {
      console.error(
        `❌ Failed to backfill order item ${row.id} after ${MAX_RETRIES_PER_ITEM} attempts.`,
      );
    }

    // In tiến độ mỗi 100 bản ghi
    if ((updatedCount + skippedCount) % 100 === 0) {
      console.log(`Progress: ${updatedCount} updated, ${skippedCount} skipped.`);
    }
  }

  console.log('✅ Backfill completed!');
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Skipped (already valid): ${skippedCount}`);
}

// Chạy script
backfillOrderItems()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
