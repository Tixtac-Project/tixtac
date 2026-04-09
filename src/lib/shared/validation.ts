/**
 * @file src/lib/shared/validation.ts
 * @description Provides utilities for data validation using Zod.
 * Includes functions for formatting Zod validation errors into a flat record
 * and a generic wrapper for enforcing schemas with consistent error handling.
 */

import { Errors } from '$lib/server/errors';
import { z } from 'zod';

/**
 * Converts a ZodError into a flat key-value object where keys are field paths.
 *
 * @param error - The ZodError object containing validation issues.
 * @returns A record where keys are dot-notated field paths and values are the first error message for that field.
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (!details[field]) details[field] = issue.message;
  }
  return details;
}

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
