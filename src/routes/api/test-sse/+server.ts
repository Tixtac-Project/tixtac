import { eventBus, SSE_EVENTS } from '$lib/server/events/event-bus';
import { json } from '@sveltejs/kit';

export const GET = async () => {
  console.log('[Test API] Đang bắn sự kiện từ Server...');
  
  eventBus.emit(SSE_EVENTS.SEAT_UPDATE(10), { 
    seatId: 888, 
    status: 'locked',
    message: 'Chào bạn, mình bắn tin từ chính Server đây!' 
  });

  return json({ message: 'Đã bắn tin nhắn thành công vào EventBus của Server!' });
};
