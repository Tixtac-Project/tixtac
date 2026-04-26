import { db } from '$lib/server/db';
import { orderItems, orders, seats } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getChannel } from './connection';
// import { EventBus } from '$lib/server/events';

export async function startWorker(retryCount = 0) {
  try {
    const ch = await getChannel();

    await ch.prefetch(10);

    ch.consume('tixtac.order.release-process', async (msg) => {
      if (!msg) return;

      try {
        let parsed: unknown;
        try {
          parsed = JSON.parse(msg.content.toString());
        } catch {
          console.error('[Worker] Invalid JSON → drop', msg.content.toString());
          ch.ack(msg);
          return;
        }
        if (typeof parsed !== 'object' || parsed === null || !('orderId' in parsed)) {
          console.error('[Worker] Invalid payload → drop', parsed);
          ch.ack(msg);
          return;
        }

        const orderId = (parsed as { orderId: unknown }).orderId;

        if (typeof orderId !== 'number') {
          console.error('[Worker] orderId must be number → drop', parsed);
          ch.ack(msg);
          return;
        }
        let releasedSeatIds: number[] = [];
        await db.transaction(async (tx) => {
          const [order] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .for('update');

          if (!order) {
            console.warn('[Worker] Order not found:', orderId);
            return;
          }

          const now = new Date();

          if (order.status !== 'pending') {
            console.log('[Worker] Already processed:', orderId);
            return;
          }

          if (order.expiresAt > now) {
            console.log('[Worker] Not expired yet:', orderId);
            return;
          }

          const items = await tx
            .select({ seatId: orderItems.seatId })
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));

          if (items.length === 0) {
            console.warn('[Worker] No items found:', orderId);
            return;
          }
          releasedSeatIds = items.map((i) => i.seatId);

          await tx
            .update(seats)
            .set({
              status: 'available',
              lockedBy: null,
              lockedAt: null,
            })
            .where(inArray(seats.id, releasedSeatIds));

          await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));
          console.log('[Worker] Released seats for order', orderId);
        });

        if (releasedSeatIds.length > 0) {
          // EventBus.emit('seats.released', {
          //   orderId,
          //   seatIds: releasedSeatIds,
          // });
        }

        ch.ack(msg);
      } catch (err) {
        console.error('[Worker] Processing error:', err);

        const headers = msg.properties.headers || {};
        const retryCount = headers['x-retry'] ?? 0;
        const MAX_RETRIES = 3;

        if (retryCount < MAX_RETRIES) {
          console.warn(`[Worker] Retry ${retryCount + 1}/${MAX_RETRIES}`);

          ch.sendToQueue('tixtac.order.release-process.retry', msg.content, {
            headers: {
              ...headers,
              'x-retry': retryCount + 1,
            },
            persistent: true,
          });

          ch.ack(msg);
        } else {
          ch.sendToQueue('tixtac.order.release-process.dlq', msg.content, { persistent: true });
          ch.ack(msg);
        }
      }
    });

    ch.once('close', () => {
      const nextRetry = retryCount + 1;
      const delay = Math.min(1000 * 2 ** nextRetry, 30000); // max 30s
      console.warn(`[Worker] Channel closed → retry in ${delay}ms`);
      setTimeout(() => {
        startWorker(nextRetry);
      }, delay);
    });
  } catch (err) {
    console.error('[Worker] Startup error:', err);

    const delay = Math.min(1000 * 2 ** retryCount, 30000);

    setTimeout(() => {
      startWorker(retryCount + 1);
    }, delay);
  }
}
