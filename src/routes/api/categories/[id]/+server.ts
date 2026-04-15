import { requireAdmin } from '$lib/server/auth/guards';
import { apiHandler } from '$lib/server/handler';
import { categoryService } from '$lib/server/services/category.service';
import { categoryIdSchema, updateCategorySchema } from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { json } from '@sveltejs/kit';

/** GET /api/categories/:id — Get a single category (public) */
export const GET = apiHandler(async ({ params }) => {
  const id = validateInput(categoryIdSchema, params.id);
  const data = await categoryService.getCategoryById(id);
  return json({ data });
});

/** PATCH /api/categories/:id — Update a category (admin only) */
export const PATCH = apiHandler(async ({ request, params, locals }) => {
  requireAdmin(locals);
  const id = validateInput(categoryIdSchema, params.id);
  const body = await request.json();
  const input = validateInput(updateCategorySchema, body);
  const data = await categoryService.updateCategory(id, input);
  return json({ data });
});

/** DELETE /api/categories/:id — Delete a category (admin only) */
export const DELETE = apiHandler(async ({ params, locals }) => {
  requireAdmin(locals);
  const id = validateInput(categoryIdSchema, params.id);
  const data = await categoryService.deleteCategory(id);
  return json({ data });
});
