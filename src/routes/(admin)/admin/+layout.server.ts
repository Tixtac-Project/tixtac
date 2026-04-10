import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  if (locals.user.role !== 'admin') error(403, 'Không có quyền truy cập');
  return { user: locals.user };
};
