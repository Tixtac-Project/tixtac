import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login?redirect=/me/profile');
  }

  // Both admin and customer can manage their own profile
  if (locals.user.role !== 'customer' && locals.user.role !== 'admin') {
    throw redirect(303, '/');
  }

  // profile is already loaded by +layout.server.ts — no duplicate fetch needed
  return {};
};
