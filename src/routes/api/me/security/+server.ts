import { requireAuth } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { userService } from '$lib/server/services/auth.service';
import { json } from '@sveltejs/kit';

export const PATCH = apiHandler(async ({ request, locals, cookies }) => {
  const user = requireAuth(locals);
  const body = await request.json();
  const result = await userService.updateSecurity(user.id, body, cookies);
  return json({ data: result }, { status: 200 });
});
