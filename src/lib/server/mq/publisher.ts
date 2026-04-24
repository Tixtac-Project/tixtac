import { config } from '$lib/server/config';
import type { CheckoutBody } from '$lib/shared/schemas';
import { getChannel } from './connection';

export type OrderHoldMessage = {
  payload: CheckoutBody;
  ttl?: number;
};

export async function publishOrderHold(payload: OrderHoldMessage) {
  const ch = await getChannel();

  const success = ch.publish('tixtac.main', 'order-hold', Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    expiration: String(payload.ttl ?? config.seatLockDuration * 1000), // override nếu cần
  });

  if (!success) {
    console.warn('[MQ] Publish buffer full');
  }
}
