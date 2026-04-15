import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (locals.user) {
    const redirectTo = url.searchParams.get('redirect');
    if (redirectTo && redirectTo.startsWith('/')) {
      throw redirect(302, redirectTo);
    }
    if (locals.user.role === 'admin') {
      throw redirect(302, '/admin');
    }
    throw redirect(302, '/');
  }
  return {};
};
