import { eventBus, SSE_EVENTS } from '$lib/server/events/event-bus';
import { apiHandler } from '$lib/server/handler';
import { Errors, throwError } from '$lib/server/errors';
import { eventIdSchema, showIdSchema } from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { db } from '$lib/server/db';
import { eventShows } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET = apiHandler(async (event) => {
  const { params, locals, request } = event;
  if (!locals.user) {
    throwError(Errors.UNAUTHORIZED, 'Vui lòng đăng nhập để xem trạng thái ghế');
  }
  // Validate the inputs just like the normal seat endpoint
  const eventId = validateInput(eventIdSchema, params.id);
  const showId = validateInput(showIdSchema, params.showId);

  // Check access to show (match event and publish status)
  const show = await db.query.eventShows.findFirst({
    where: eq(eventShows.id, showId),
    with: {
      event: true,
    },
  });

  if (!show || show.eventId !== eventId) {
    throwError(Errors.NOT_FOUND, 'Không tìm thấy suất diễn.');
  }

  if (locals.user.role === 'customer') {
    if (show.status !== 'published' || show.event.status !== 'published') {
      throwError(Errors.NOT_FOUND, 'Suất diễn chưa được mở bán.');
    }
  }

  const eventName = SSE_EVENTS.SEAT_UPDATE(showId);

  let intervalId: ReturnType<typeof setInterval> | undefined;
  let listener: (data: unknown) => void;
  let cleaned = false;
  let streamController: ReadableStreamDefaultController | undefined;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      if (request.signal.aborted) {
        cleanup();
        return;
      }

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
    },
  });

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    console.log(`[SSE] Cleaning up resources for show ${showId}`);
    if (listener) eventBus.off(eventName, listener);
    if (intervalId) clearInterval(intervalId);
    intervalId = undefined;

    try {
      streamController?.close();
    } catch (error) {
      console.log(error);
    }
  }

  request.signal.addEventListener('abort', cleanup, { once: true });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
