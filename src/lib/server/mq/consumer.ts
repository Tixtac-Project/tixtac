import { orderService } from '$lib/server/services/order.service';
import { getChannel } from './connection';
// import { EventBus } from '$lib/server/events';

export async function startWorker(retryCount = 0) {
  try {
    const ch = await getChannel();

    await ch.prefetch(10);

    ch.consume('tixtac.order.release-process', async (msg) => {
      if (!msg) return;

      let orderId: number;
      try {
        const parsed = JSON.parse(msg.content.toString());
        if (typeof parsed?.orderId !== 'number') throw new Error('Invalid orderId');
        orderId = parsed.orderId;
      } catch {
        console.error('[Worker] Invalid message → drop');
        ch.ack(msg);
        return;
      }
      try {
        const { releasedSeatIds } = await orderService.releaseExpiredOrder(orderId);
        if (releasedSeatIds.length > 0) {
          // EventBus.emit('seats.released', {
          //   orderId,
          //   seatIds: releasedSeatIds,
          // });
        }
        ch.ack(msg);
      } catch (err) {
        console.error(`[Worker] System error processing order ${orderId}:`, err);

        const headers = msg.properties.headers || {};
        const retries = headers['x-retry'] ?? 0;
        const MAX_RETRIES = 3;

        if (retries < MAX_RETRIES) {
          console.warn(`[Worker] Retry ${retries + 1}/${MAX_RETRIES}`);
          ch.sendToQueue('tixtac.order.release-process.retry', msg.content, {
            headers: { ...headers, 'x-retry': retries + 1 },
            persistent: true,
          });
        } else {
          ch.sendToQueue('tixtac.order.release-process.dlq', msg.content, { persistent: true });
        }

        ch.ack(msg);
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
