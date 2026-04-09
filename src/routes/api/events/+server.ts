import { requireAdmin } from '$lib/server/auth/guards';
import { createEvent } from '$lib/server/services/event.service';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

interface ValidationError extends Error {
  name: 'ValidationError';
  details: Record<string, string[]>;
}

function isValidationError(err: unknown): err is ValidationError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: unknown }).name === 'ValidationError' &&
    'details' in err
  );
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const admin = requireAdmin(locals);

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ code: 'INVALID_JSON', message: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await createEvent(admin.id, body);
    return json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    if (isValidationError(err)) {
      return new Response(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: err.details,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    console.error(err);
    return new Response(
      JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
