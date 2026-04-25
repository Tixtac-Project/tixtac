import { verifyAuthToken } from '$lib/server/auth/jwt';
import { startWorker } from '$lib/server/mq/consumer';
import { initMQWithRetry } from '$lib/server/mq/initMQ';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const mqInitPromise = initMQWithRetry();
await startWorker();

await mqInitPromise;

// ── Security headers (CSP + common hardening) ──
const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Prevent MIME-type sniffing (stops browser from treating image respone as HTMsL)
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Control referrer leakage to external image hosts
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
};

// ── Auth handler ──
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

    event.locals.user = {
      id: typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : Number(payload.sub),
      role: role as 'admin' | 'customer',
    };
  } catch (e) {
    console.warn('[auth] Token validation failed:', e instanceof Error ? e.message : e);
    event.cookies.delete('auth_token', { path: '/' });
    event.locals.user = null;
  }

  return resolve(event);
};

export const handle = sequence(securityHeaders, auth);
