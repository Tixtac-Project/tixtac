import {
  updateEmailSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from '$lib/shared/schemas/auth.schema';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const _profileAdapter = zod4(updateProfileSchema);
const _emailAdapter = zod4(updateEmailSchema);
const _passwordAdapter = zod4(updatePasswordSchema);

export const load: PageServerLoad = async ({ locals, parent }) => {
  if (!locals.user) {
    throw redirect(302, '/login?redirect=/me/profile');
  }

  if (locals.user.role !== 'customer' && locals.user.role !== 'admin') {
    throw redirect(303, '/');
  }

  const { profile } = await parent();

  // Populate profile form with existing data from layout's profile fetch
  const profileForm = await superValidate(
    profile
      ? {
          full_name: profile.full_name,
          phone: profile.phone ?? '',
          date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
          gender: profile.gender,
        }
      : {},
    _profileAdapter,
  );

  const emailForm = await superValidate(_emailAdapter);
  const passwordForm = await superValidate(_passwordAdapter);

  return { profileForm, emailForm, passwordForm };
};
