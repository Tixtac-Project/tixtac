import { verifyAuthToken } from "$lib/server/auth/jwt";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('auth_token');

  if (!token) {
    event.locals.user = null;
    return resolve(event);
  }

  try {
    const payload = await verifyAuthToken(token);
    event.locals.user = {
      id: Number(payload.sub),
      role: payload.role as 'admin' | 'customer'
    }
  } catch (e) {
    event.cookies.delete('auth_token', { path: '/'});
    event.locals.user = null;
  }

  return resolve(event);
};
