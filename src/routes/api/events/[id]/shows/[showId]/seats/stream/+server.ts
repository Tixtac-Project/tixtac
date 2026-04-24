import { eventBus, SSE_EVENTS } from '$lib/server/events/event-bus';
import { apiHandler } from '$lib/server/handler';
import { Errors, throwError } from '$lib/server/errors';
import { eventIdSchema, showIdSchema } from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';

export const GET = apiHandler(async (event) => {
  const { params, locals, request } = event;
  if (!locals.user) {
    throwError(Errors.UNAUTHORIZED, 'Vui lòng đăng nhập để xem trạng thái ghế');
  }
  // Validate the inputs just like the normal seat endpoint
  validateInput(eventIdSchema, params.id);
  const showId = validateInput(showIdSchema, params.showId);

  const eventName = SSE_EVENTS.SEAT_UPDATE(showId);

  let intervalId: ReturnType<typeof setInterval> | undefined;
  let listener: (data: unknown) => void;

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Client connected to show ${showId}`);

      listener = (data) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
          cleanup();
        }
      };

      eventBus.on(eventName, listener);

      intervalId = setInterval(() => {
        try {
          controller.enqueue(`:\n\n`);
        } catch {
          cleanup();
        }
      }, 8000);
    },
    cancel() {
      cleanup();
    }
  });

  function cleanup() {
    if (intervalId) {
      console.log(`[SSE] Cleaning up resources for show ${showId}`);
      eventBus.off(eventName, listener);
      clearInterval(intervalId);
      intervalId = undefined;
    }
  }

  // Lắng nghe sự kiện đóng kết nối từ Request Signal
  request.signal.addEventListener('abort', () => {
    cleanup();
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});
