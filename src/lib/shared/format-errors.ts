/**
 * @file src/lib/shared/format-errors.ts
 * @description Client-safe utility for converting Zod errors into a flat field→message map.
 * This file has NO server-only imports and can be safely used in .svelte components.
 */

import type { z } from 'zod';

/**
 * Converts a ZodError into a flat key-value object where keys are field paths.
 *
 * @param error - The ZodError object containing validation issues.
 * @returns A record where keys are dot-notated field paths and values are the first error message for that field.
 *
 * @example
 * ```ts
 * const result = schema.safeParse(data);
 * if (!result.success) {
 *   const errors = formatZodErrors(result.error);
 *   // { email: "Email không đúng định dạng", password: "Mật khẩu tối thiểu 8 ký tự" }
 * }
 * ```
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (!details[field]) details[field] = issue.message;
  }
  return details;
}
