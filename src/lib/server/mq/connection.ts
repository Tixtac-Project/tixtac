import { config } from '$lib/server/config';
import type { Channel, ChannelModel } from 'amqplib';
import * as amqp from 'amqplib';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let connecting: Promise<Channel> | null = null;

const MQ_URL = config.cloudAMQPUrl!;

async function createChannel(): Promise<Channel> {
  if (!connection) {
    console.log('[MQ] Connecting...');

    connection = await amqp.connect(MQ_URL);

    connection.on('error', (err) => {
      console.error('[MQ] Connection error:', err);
    });

    connection.on('close', () => {
      console.warn('[MQ] Connection closed → resetting...');
      connection = null;
      channel = null;
      connecting = null;
    });
  }

  if (!connection) {
    throw new Error('MQ connection not initialized');
  }

  const ch = await connection.createChannel();

  ch.on('error', (err) => {
    console.error('[MQ] Channel error:', err);
  });
  ch.on('close', () => {
    console.warn('[MQ] Channel closed → resetting...');
    channel = null;
    connecting = null;
  });

  channel = ch;
  console.log('[MQ] Channel created');
  return ch;
}

export async function getChannel(): Promise<Channel> {
  if (channel && connection) return channel;

  if (!connecting) {
    connecting = (async () => {
      try {
        channel = await createChannel();
        return channel;
      } catch (err) {
        connecting = null;
        throw err;
      }
    })();
  }

  return connecting;
}

export async function closeMQ() {
  try {
    await connection?.close();
    console.log('[MQ] Connection closed gracefully');
  } catch (err) {
    console.error('[MQ] Error during shutdown:', err);
  }
}

const shutdown = async (signal: string) => {
  console.log(`[MQ] ${signal} received`);
  await closeMQ();
  console.log('[MQ] shutdown complete');
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
