import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    throw redirect(302, '/login');
  }
  return { token };
};
