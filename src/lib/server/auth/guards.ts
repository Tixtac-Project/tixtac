import { Errors, throwError } from '$lib/server/errors';

export function requireAuth(locals: App.Locals) {
  if (!locals.user) {
    throwError(Errors.UNAUTHORIZED);
  }
  return locals.user;
}

export function requireAdmin(locals: App.Locals) {
  const user = requireAuth(locals);

  if (user.role !== 'admin') {
    throwError(Errors.FORBIDDEN);
  }

  return user;
}

export function requireCustomer(locals: App.Locals) {
  const user = requireAuth(locals);

  if (user.role !== 'customer') {
    throwError(Errors.FORBIDDEN, 'Tính năng chỉ dành cho khách hàng');
  }

  return user;
}
