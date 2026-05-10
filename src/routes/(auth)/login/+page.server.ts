import { loginSchema } from '$lib/shared/schemas/auth.schema';
import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';

const _adapter = zod4(loginSchema);

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

  const form = await superValidate(_adapter);
  return { form };
};
