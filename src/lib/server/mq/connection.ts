import { AMQP_URL } from '$env/static/private';
import amqp from 'amqplib';

export async function publishTestMessage(queueName: string, message: object) {
  let connection;
  try {
    // 1. Kết nối tới CloudAMQP
    connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createChannel();

    // 2. Khai báo hàng chờ (durable: true để message không mất khi restart)
    await channel.assertQueue(queueName, { durable: true });

    // 3. Gửi message (dưới dạng Buffer)
    const payload = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    });

    channel.sendToQueue(queueName, Buffer.from(payload));

    console.log(`🚀 [MQ] Message sent to ${queueName}:`, payload);

    // 4. Đóng kết nối sau khi gửi (chỉ dùng cho mục đích test khởi tạo)
    await channel.close();
  } catch (error) {
    console.error('❌ [MQ] Publish failed:', error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}
