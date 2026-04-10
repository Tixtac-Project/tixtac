import { requireAdmin } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';
import { eventService } from '$lib/server/services/event.service';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ request, params, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const body = await request.json();
    const data = await eventService.updateEventSections(admin.id, Number(params.id), body);
    return json({ data }, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof AppError)
      return json(
        { error: { code: e.code, message: e.message, details: e.details } },
        { status: e.statusCode },
      );
    if (e instanceof SyntaxError)
      return json({ error: { code: 'VALIDATION', message: 'JSON lỗi' } }, { status: 400 });
    return json({ error: { code: 'SERVER_ERROR', message: 'Lỗi máy chủ' } }, { status: 500 });
  }
};
