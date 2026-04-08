import { error } from "@sveltejs/kit";

export function requireAuth(locals: App.Locals) {
  if (!locals.user) {
    error(401, 'Vui lòng đăng nhập để tiếp tục');
  }
  return locals.user;
}

export function requireAdmin(locals: App.Locals) {
  const user = requireAuth(locals);
  if (user.role !== 'admin') {
    error(403, 'Bạn không có quyền truy cập chức năng này');
  }
  return user;
}

export function requireCustomer(locals: App.Locals) {
  const user = requireAuth(locals);
  if (user.role !== 'customer') {
    error(403, 'Tính năng chỉ dành cho khách hàng');
  }
  return user;
}
