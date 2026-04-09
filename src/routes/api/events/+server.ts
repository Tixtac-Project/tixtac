import { requireAdmin } from '$lib/server/auth/guards';
import { AppError } from '$lib/server/errors';
import { eventService } from '$lib/server/services/event.service';
import { createEventSchema } from '$lib/shared/schemas/event.schema';
import { validateInput } from '$lib/shared/validation';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const admin = requireAdmin(locals);

    const body = await request.json();

    const input = validateInput(createEventSchema, body);

    const result = await eventService.createEvent(admin.id, input);

    return json({ data: result }, { status: 201 });
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

    console.error('Publish Event API Error:', e);
    return json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
};
