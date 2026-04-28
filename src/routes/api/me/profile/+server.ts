import { requireAuth } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { authService } from '$lib/server/services/auth.service';
import { json } from '@sveltejs/kit';

export const PATCH = apiHandler(async ({ request, locals }) => {
  const user = requireAuth(locals);
  const body = await request.json();
  const profile = await authService.updateProfile(user.id, body);
  return json({ data: profile }, { status: 200 });
});

export const GET = apiHandler(async ({ locals }) => {
  const user = requireAuth(locals);
  const profile = await authService.getProfile(user.id);
  return json({ data: profile });
});
