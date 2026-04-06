import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // TODO (#5): Đọc JWT từ cookie và verify
  // const token = event.cookies.get('auth_token');
  //
  // if (token) {
  //   try {
  //     const payload = verifyToken(token);
  //     event.locals.user = { id: payload.sub, role: payload.role };
  //   } catch {
  //     event.locals.user = null;
  //     event.cookies.delete('auth_token', { path: '/' });
  //   }
  // }

  event.locals.user = null;

  return resolve(event);
};
