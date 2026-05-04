// src/routes/(customer)/me/profile/+page.server.ts
import type { PageServerLoad } from '.$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const user = locals.user;

  if (!user) {
    throw redirect(302, '/login');
  }

  if (user.role !== 'customer') {
    throw redirect(303, '/');
  }

  const res = await fetch('/api/me/profile');
  if (!res.ok) {
    return { user: locals.user, profile: null };
  }
  const { data: profile } = await res.json();

  return {
    user: locals.user,
    profile,
  };
};
