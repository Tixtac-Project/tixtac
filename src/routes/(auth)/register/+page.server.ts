import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    if (locals.user.role === 'admin') {
      throw redirect(302, '/admin');
    }
    throw redirect(302, '/');
  }
  return {};
};
