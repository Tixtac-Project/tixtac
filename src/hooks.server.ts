import { verifyAuthToken } from '$lib/server/auth/jwt';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('auth_token');

  if (!token) {
    event.locals.user = null;
    return resolve(event);
  }

  try {
    const payload = (await verifyAuthToken(token)) as { sub: number; role: string };
    const role = payload.role;

    if (role !== 'admin' && role !== 'customer') {
      throw new Error('Role trong token không hợp lệ!');
    }

    event.locals.user = {
      id: Number(payload.sub),
      role: role as 'admin' | 'customer',
    };
  } catch (e) {
    event.cookies.delete('auth_token', { path: '/' });
    event.locals.user = null;
  }

  return resolve(event);
};
