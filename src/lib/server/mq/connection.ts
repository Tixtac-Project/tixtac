import { config } from '$lib/server/config';
import type { Channel, ChannelModel } from 'amqplib';
import * as amqp from 'amqplib';

let connection: ChannelModel  | null = null;
let channel: Channel | null = null;
let connecting: Promise<Channel> | null = null;

const MQ_URL = config.cloudAMQPURL!;

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
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => {
  console.log('[MQ] process exit event fired');
});

// export async function publishTestMessage(queueName: string, message: object) {
//   let connection;
//   try {
//     // 1. Kết nối tới CloudAMQP
//     connection = await amqp.connect(AMQP_URL);
//     const channel = await connection.createChannel();

//     // 2. Khai báo hàng chờ (durable: true để message không mất khi restart)
//     await channel.assertQueue(queueName, { durable: true });

//     // 3. Gửi message (dưới dạng Buffer)
//     const payload = JSON.stringify({
//       ...message,
//       timestamp: new Date().toISOString(),
//     });

//     channel.sendToQueue(queueName, Buffer.from(payload));

//     console.log(`🚀 [MQ] Message sent to ${queueName}:`, payload);

//     // 4. Đóng kết nối sau khi gửi (chỉ dùng cho mục đích test khởi tạo)
//     await channel.close();
//   } catch (error) {
//     console.error('❌ [MQ] Publish failed:', error);
//     throw error;
//   } finally {
//     if (connection) await connection.close();
//   }
// }
