/**
 * @file src/lib/shared/validation.ts
 * @description Provides utilities for data validation using Zod.
 * Re-exports the client-safe formatZodErrors from format-errors.ts
 * and provides the server-only validateInput wrapper with AppError integration.
 *
 * NOTE: This file imports from $lib/server/errors, making it server-only.
 * Client components should import formatZodErrors from '$lib/shared/format-errors' instead.
 */

import { Errors } from '$lib/server/errors';
import { z } from 'zod';
import { formatZodErrors } from './format-errors';

// Re-export so existing server imports still work
export { formatZodErrors };

/**
 * Validates data against a Zod schema.
 * Throws an AppError (VALIDATION_ERROR) if validation fails, otherwise returns the parsed and typed data.
 *
 * @template TSchema - The Zod schema type.
 * @param schema - The Zod schema to validate against.
 * @param data - The raw data to be validated.
 * @returns The validated and inferred data type.
 * @throws {AppError} Throws a 400 VALIDATION_ERROR with field-level details if data is invalid.
 */
export function validateInput<TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Errors.VALIDATION(formatZodErrors(result.error));
  }
  return result.data;
}
