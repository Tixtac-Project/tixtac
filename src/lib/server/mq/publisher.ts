import { config } from '$lib/server/config';
import { getChannel } from './connection';

export async function publishOrderTimeout(orderId: number, ttl?: number) {
  const ch = await getChannel();

  const payload = JSON.stringify({ orderId });

  const expiration = ttl ?? config.seatLockDuration * 1000;

  const ok = ch.publish('tixtac.main', 'order-hold', Buffer.from(payload), {
    persistent: true,
    expiration: String(expiration), // optional
  });

  if (!ok) {
    console.warn('[MQ] Publish buffer full');
  }
}
