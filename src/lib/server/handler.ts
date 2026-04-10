// src/lib/server/handler.ts
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { AppError } from './errors';

/**
 * Wraps an API route handler with standardized error handling.
 *
 * Eliminates the need for repetitive try/catch in every +server.ts file.
 * Errors are caught and converted to consistent JSON responses:
 *
 * | Error Type    | HTTP | Response code      |
 * |---------------|------|--------------------|
 * | SyntaxError   | 400  | VALIDATION_ERROR   |
 * | AppError      | *    | (from error catalog)|
 * | Unknown       | 500  | INTERNAL_ERROR     |
 *
 * Usage:
 * ```ts
 * export const POST = apiHandler(async ({ request, locals }) => {
 *   const admin = requireAdmin(locals);
 *   const body = await request.json();
 *   const data = await someService.doSomething(body);
 *   return json({ data }, { status: 201 });
 * });
 * ```
 */
export function apiHandler(fn: (event: RequestEvent) => Promise<Response>): RequestHandler {
  return async (event) => {
    try {
      return await fn(event);
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        return json(
          { error: { code: 'VALIDATION_ERROR', message: 'Định dạng JSON không hợp lệ' } },
          { status: 400 },
        );
      }

      if (e instanceof AppError) {
        return json(
          {
            error: {
              code: e.code,
              message: e.message,
              ...(e.details && { details: e.details }),
            },
          },
          { status: e.statusCode },
        );
      }

      console.error('[API Error]', event.request.method, event.url.pathname, e);
      return json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } },
        { status: 500 },
      );
    }
  };
}
