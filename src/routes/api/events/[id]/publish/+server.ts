import { requireAdmin } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';
import { eventService } from '$lib/server/services/event.service';
import { publishEventParamSchema } from '$lib/shared/schemas/event.schema';
import { validateInput } from '$lib/shared/validation';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, locals }) => {
  try {
    requireAdmin(locals);

    const { id } = validateInput(publishEventParamSchema, params);

    const result = await eventService.publishEvent(id);

    return json({ data: result });
  } catch (e) {
    if (e instanceof AppError) {
      return json(
        {
          error: {
            code: e.code,
            message: e.message,
            ...(e.details && { details: e.details }),
          },
        },
        { status: e.statusCode },
      );
    }

    console.error('Create Event API Error:', e);
    return json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
};
