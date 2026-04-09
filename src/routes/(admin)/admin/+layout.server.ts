import { redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards';

export const load = async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/login');
  }
  requireAdmin(locals);

  return { user: locals.user };
};
