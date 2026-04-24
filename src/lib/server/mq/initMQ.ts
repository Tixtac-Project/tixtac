import { config } from '$lib/server/config';
import { getChannel } from './connection';

export async function initMQ() {
  const ch = await getChannel();

  // Exchanges
  await ch.assertExchange('tixtac.main', 'direct', { durable: true });
  await ch.assertExchange('tixtac.release-dlx', 'direct', { durable: true });

  // Delay Queue
  await ch.assertQueue('tixtac.order.delay', {
    durable: true,
    arguments: {
      'x-message-ttl': config.seatLockDuration * 1000,
      'x-dead-letter-exchange': 'tixtac.release-dlx',
      'x-dead-letter-routing-key': 'release-task'
    }
  });

  // Process Queue
  await ch.assertQueue('tixtac.order.release-process', {
    durable: true
  });

  // Bindings
  await ch.bindQueue('tixtac.order.delay', 'tixtac.main', 'order-hold');
  await ch.bindQueue(
    'tixtac.order.release-process',
    'tixtac.release-dlx',
    'release-task'
  );

  console.log('[MQ] Topology initialized');
}

export async function initMQWithRetry(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      await initMQ();
      return;
    } catch (err) {
      console.error(`[MQ] Init failed (attempt ${i + 1})`, err);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  console.error('[MQ] Failed to initialize after retries');
}
