import { eventBus, SSE_EVENTS } from '$lib/server/events/event-bus';
import { apiHandler } from '$lib/server/handler';
import { Errors, throwError } from '$lib/server/errors';
import { validateInput } from '$lib/shared/validation';
import { eventIdSchema, showIdSchema } from '$lib/shared/schemas';

export const GET = apiHandler(async ({ params, locals }) => {
/*
  if (!locals.user) {
    throwError(Errors.UNAUTHORIZED, 'Vui lòng đăng nhập để xem trạng thái ghế');
  }
*/

  // Validate the inputs just like the normal seat endpoint
  validateInput(eventIdSchema, params.id);
  const showId = validateInput(showIdSchema, params.showId);

  const eventName = SSE_EVENTS.SEAT_UPDATE(showId);

  let intervalId: ReturnType<typeof setInterval>;
  let listener: (data: unknown) => void;

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Client connected to show ${showId}`);

      // 1. Định nghĩa listener đẩy data vào stream
      listener = (data) => {
        try {
          // Chuẩn SSE bắt buộc phải bắt đầu bằng 'data: ' và kết thúc bằng 2 ký tự xuống dòng
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          console.error('[SSE] Lỗi khi enqueue data:', err);
        }
      };

      // 2. Đăng ký lắng nghe sự kiện
      eventBus.on(eventName, listener);

      // 3. Cơ chế Heartbeat (Keep-alive)
      intervalId = setInterval(() => {
        try {
          controller.enqueue(`:\n\n`);
        } catch (err) {
          console.error('[SSE] Heartbeat error:', err);
        }
      }, 8000);
    },
    cancel() {
      // 4. Xóa rác, chống rò rỉ bộ nhớ
      console.log(`[SSE] Client disconnected from show ${showId}`);
      eventBus.off(eventName, listener);
      clearInterval(intervalId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});
