// DEPRECATED: Section updates now happen at the show level.
// Use PUT /api/events/[id]/shows/[showId] instead.
// This file is kept for backward compatibility but returns 410 Gone.

import { apiHandler } from '$lib/server/handler';
import { json } from '@sveltejs/kit';

export const PUT = apiHandler(async () => {
  return json(
    {
      error: {
        code: 'DEPRECATED',
        message:
          'Section updates are now per-show. Use PUT /api/events/{eventId}/shows/{showId} instead.',
      },
    },
    { status: 410 },
  );
});
