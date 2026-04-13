import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { eq } from 'drizzle-orm';

export const categoryService = {
  /** List all categories ordered by sortOrder */
  async listCategories() {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(categories.sortOrder, categories.name);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      sort_order: r.sortOrder,
    }));
  },

  /** Get a single category by ID */
  async getCategoryById(id: number) {
    const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!cat) throwError(Errors.NOT_FOUND);
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      sort_order: cat.sortOrder,
    };
  },

  /** Create a new category (admin only) */
  async createCategory(data: { name: string; slug: string; sort_order?: number }) {
    const [created] = await db
      .insert(categories)
      .values({
        name: data.name,
        slug: data.slug,
        sortOrder: data.sort_order ?? 0,
      })
      .returning();

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      sort_order: created.sortOrder,
    };
  },

  /** Update a category (admin only) */
  async updateCategory(id: number, data: { name?: string; slug?: string; sort_order?: number }) {
    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) throwError(Errors.NOT_FOUND);

    const [updated] = await db
      .update(categories)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.sort_order !== undefined && { sortOrder: data.sort_order }),
      })
      .where(eq(categories.id, id))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      sort_order: updated.sortOrder,
    };
  },

  /** Delete a category (admin only). Will fail if events reference it (ON DELETE RESTRICT). */
  async deleteCategory(id: number) {
    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) throwError(Errors.NOT_FOUND);

    await db.delete(categories).where(eq(categories.id, id));
    return { id };
  },
};
