// src/lib/shared/schemas/category.schema.ts
import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = z.object({
  name: z
    .string({
      error: (issue: { input: unknown }) =>
        issue.input === undefined ? 'Tên danh mục là bắt buộc' : undefined,
    })
    .min(1, 'Tên danh mục không được trống')
    .max(100, 'Tên danh mục tối đa 100 ký tự'),
  slug: z
    .string({
      error: (issue: { input: unknown }) =>
        issue.input === undefined ? 'Slug là bắt buộc' : undefined,
    })
    .min(1, 'Slug không được trống')
    .max(100, 'Slug tối đa 100 ký tự')
    .regex(slugRegex, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang (vd: nhac-song)'),
  sort_order: z.number().int().min(0).default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(slugRegex, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang')
    .optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const categoryIdSchema = z.coerce.number().int().positive('ID danh mục không hợp lệ');

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
