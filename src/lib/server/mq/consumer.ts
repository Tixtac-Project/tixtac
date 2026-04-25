import { db } from '$lib/server/db';
import { orderItems, orders, seats } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getChannel } from './connection';

export async function startWorker() {
  const ch = await getChannel();

  ch.prefetch(10);

  ch.consume('tixtac.order.release-process', async (msg) => {
    if (!msg) return;

    const { orderId } = JSON.parse(msg.content.toString());

    let shouldAck = false;

    try {
      await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');

        if (!order) {
          shouldAck = true;
          return;
        }

        const now = new Date();

        if (order.status !== 'pending' || order.expiresAt > now) {
          console.log('[Worker] Skip order', orderId);
          shouldAck = true;
          return;
        }

        const items = await tx
          .select({ seatId: orderItems.seatId })
          .from(orderItems)
          .where(eq(orderItems.orderId, orderId));

        if (items.length === 0) {
          shouldAck = true;
          return;
        }

        await tx
          .update(seats)
          .set({
            status: 'available',
            lockedBy: null,
            lockedAt: null,
          })
          .where(
            inArray(
              seats.id,
              items.map((i) => i.seatId),
            ),
          );

        await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));

        console.log('[Worker] Released seats for order', orderId);

        shouldAck = true;
      });

      if (shouldAck) ch.ack(msg);
      else ch.nack(msg, false, true);
    } catch (err) {
      console.error('[Worker] Error:', err);
      ch.ack(msg);
    }
  });

  ch.on('close', () => {
    console.warn('[Worker] Channel closed → restarting...');
    setTimeout(startWorker, 1000);
  });
}
