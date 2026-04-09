// src/lib/shared/validation.ts
import type { ZodTypeAny, ZodError, z } from 'zod';
import { AppError } from '$lib/server/errors';

export function formatZodErrors(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    // ✅ .issues đúng cho v4 (.errors đã bị xóa)
    const field = issue.path.join('.');
    if (!details[field]) details[field] = issue.message;
  }
  return details;
}

// ✅ Generic tự infer — không cần validateInput<RegisterInput>(schema, data) nữa
export function validateInput<TSchema extends ZodTypeAny>(
  schema: TSchema,
  data: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      400,
      'Dữ liệu không hợp lệ',
      formatZodErrors(result.error),
    );
  }
  return result.data;
}
