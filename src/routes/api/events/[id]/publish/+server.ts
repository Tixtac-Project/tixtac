import { requireAdmin } from '$lib/server/auth/guards';
import { publishEvent } from '$lib/server/services/event.service';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

function isErrorWithMessage(err: unknown): err is { message: string } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

export const PATCH: RequestHandler = async ({ params, locals }) => {
  requireAdmin(locals);

  const eventId = Number(params.id);
  if (isNaN(eventId)) {
    return new Response(JSON.stringify({ code: 'INVALID_ID', message: 'ID không hợp lệ' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const updated = await publishEvent(eventId);
    return json({ data: updated });
  } catch (err: unknown) {
    if (isErrorWithMessage(err)) {
      if (err.message === 'EVENT_NOT_FOUND') {
        return new Response(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Sự kiện không tồn tại' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (err.message === 'ALREADY_PUBLISHED') {
        return new Response(
          JSON.stringify({ code: 'ALREADY_PUBLISHED', message: 'Sự kiện đã được xuất bản' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }
    console.error(err);
    return new Response(
      JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
