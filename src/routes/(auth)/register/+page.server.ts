import { registerSchema } from '$lib/shared/schemas/auth.schema';
import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';

const _adapter = zod4(registerSchema);

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    if (locals.user.role === 'admin') {
      throw redirect(302, '/admin');
    }
    throw redirect(302, '/');
  }
  const form = await superValidate(_adapter);
  return { form };
};
