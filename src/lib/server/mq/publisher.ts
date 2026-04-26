import type { CheckoutBody } from '$lib/shared/schemas';
import { getChannel } from './connection';

export type OrderHoldMessage = {
  payload: CheckoutBody;
  ttl?: number;
};

export async function publishOrderTimeout(orderId: number, ttl?: number) {
  const ch = await getChannel();

  const payload = JSON.stringify({ orderId });

  const ok = ch.publish('tixtac.main', 'order-hold', Buffer.from(payload), {
    persistent: true,
    expiration: ttl ? String(ttl) : undefined, // optional
  });

  if (!ok) {
    console.warn('[MQ] Publish buffer full');
  }
}
