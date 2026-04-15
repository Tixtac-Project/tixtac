import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { categoryService } from '$lib/server/services/category.service';
import { createCategorySchema } from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { json } from '@sveltejs/kit';

/** GET /api/categories — List all categories (public) */
export const GET = apiHandler(async () => {
  const data = await categoryService.listCategories();
  return json({ data });
});

/** POST /api/categories — Create a new category (admin only) */
export const POST = apiHandler(async ({ request, locals }) => {
  requireAdmin(locals);
  const body = await request.json();
  const input = validateInput(createCategorySchema, body);
  const data = await categoryService.createCategory(input);
  return json({ data }, { status: 201 });
});
