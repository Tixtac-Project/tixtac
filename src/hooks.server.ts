import { verifyAuthToken } from '$lib/server/auth/jwt';
import { startWorker } from '$lib/server/mq/consumer';
import { initMQWithRetry } from '$lib/server/mq/initMQ';
import { startQueueWorkerLoop } from '$lib/server/workers/queue.worker';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { config } from '$lib/server/config';

// Fire-and-forget background init — must not block server startup on slow MQ connect.
// Controlled via ENABLE_BACKGROUND_WORKERS env var (default: true).
if (config.enableBackgroundWorkers) {
  void (async () => {
    try {
      await initMQWithRetry();
      await startWorker();
    } catch (err) {
      console.error('[MQ] Background init failed:', err);
    }
  })();
}

// Start the per-event queue capacity worker loop.
// All DB access and Redis operations live in workers/queue.worker.ts.
startQueueWorkerLoop();

const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  return response;
};

const auth: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('auth_token');

  if (!token) {
    event.locals.user = null;
    return resolve(event);
  }

  try {
    const raw = await verifyAuthToken(token);

    if (
      !raw ||
      typeof raw !== 'object' ||
      typeof (raw as Record<string, unknown>).role !== 'string'
    ) {
      throw new Error('Malformed token payload');
    }

    const payload = raw as { sub: string | number; role: string };
    const role = payload.role;

    if (role !== 'admin' && role !== 'customer') {
      throw new Error('Invalid role in token');
    }

    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid sub in token');
    }
    event.locals.user = { id, role: role as 'admin' | 'customer' };
  } catch (e) {
    console.warn('[auth] Token validation failed:', e instanceof Error ? e.message : e);
    event.cookies.delete('auth_token', { path: '/' });
    event.locals.user = null;
  }

  return resolve(event);
};

export const handle = sequence(securityHeaders, auth);
