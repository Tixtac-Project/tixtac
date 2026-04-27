import { eventBus, SSE_EVENTS } from '$lib/server/events/event-bus';
import { orderService } from '$lib/server/services/order.service';
import { getChannel } from './connection';

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
        console.log(`[Worker] <--- Nhận lệnh xử lý Đơn hàng: ${orderId}`);
        const { releasedSeats } = await orderService.releaseExpiredOrder(orderId);
        if (releasedSeats.length > 0) {
          console.log(`[Worker] SUCCESS: Đã nhả ${releasedSeats.length} ghế cho đơn ${orderId}`);
          const seatsByShow = releasedSeats.reduce(
            (acc, curr) => {
              if (!acc[curr.showId]) acc[curr.showId] = [];
              acc[curr.showId].push(curr.id);
              return acc;
            },
            {} as Record<number, number[]>,
          );

          try {
            for (const [sId, sIds] of Object.entries(seatsByShow)) {
              const numShowId = Number(sId);
              eventBus.emit(SSE_EVENTS.SEAT_UPDATE(numShowId), {
                showId: numShowId,
                seatIds: sIds,
                status: 'available',
              });
            }
          } catch (emitErr) {
            console.error(
              `[Worker] SSE emit failed for order ${orderId}, seats already released`,
              emitErr,
            );
          }
        } else {
          console.log(
            `[Worker] SKIP: Đơn hàng ${orderId} không cần nhả ghế (chưa hết hạn hoặc đã thanh toán)`,
          );
        }
        ch.ack(msg);
      } catch (err) {
        console.error(`[Worker] System error processing order ${orderId}:`, err);

        const headers = msg.properties.headers || {};
        const retries = headers['x-retry'] ?? 0;
        const MAX_RETRIES = 3;

        let republished = false;
        try {
          if (retries < MAX_RETRIES) {
            console.warn(`[Worker] Retry ${retries + 1}/${MAX_RETRIES}`);
            republished = ch.sendToQueue('tixtac.order.release-process.retry', msg.content, {
              headers: { ...headers, 'x-retry': retries + 1 },
              persistent: true,
            });
          } else {
            republished = ch.sendToQueue('tixtac.order.release-process.dlq', msg.content, {
              persistent: true,
            });
          }
        } catch (publishErr) {
          console.error('[Worker] Failed to republish to retry/DLQ:', publishErr);
          // republished stays false
        }

        if (republished) {
          ch.ack(msg);
        } else {
          // nack with requeue so the message is retried by the broker
          ch.nack(msg, false, true);
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
