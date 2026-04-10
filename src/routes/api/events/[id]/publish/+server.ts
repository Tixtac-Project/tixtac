import { requireAdmin } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';
import { eventService } from '$lib/server/services/event.service';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const PATCH: RequestHandler = async ({ params, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const data = await eventService.publishEvent(admin.id, Number(params.id));
    return json({ data }, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof AppError)
      return json({ error: { code: e.code, message: e.message } }, { status: e.statusCode });
    return json({ error: { code: 'SERVER_ERROR', message: 'Lỗi máy chủ' } }, { status: 500 });
  }
};
