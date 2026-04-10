// src/lib/server/errors.ts

/**
 * Base error class for all application-level (HTTP) errors.
 * Caught by route handlers and serialized into JSON responses.
 *
 * Do NOT use for startup/config errors — use plain `Error` instead.
 */
export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, string>;

  constructor(
    code: string,
    statusCode: number,
    message?: string,
    details?: Record<string, string>,
  ) {
    super(message || code);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Pre-defined error catalog.
 *
 * Two kinds of entries:
 *
 * 1. **Static singletons** (e.g. `Errors.UNAUTHORIZED`)
 *    – Fixed code + statusCode + message. No dynamic data.
 *    – Usage: `throwError(Errors.UNAUTHORIZED)`
 *      (throwError clones them so the singleton is never mutated)
 *
 * 2. **Factory functions** (e.g. `Errors.VALIDATION(details)`)
 *    – Need dynamic data (like field-level details) at call site.
 *    – Usage: `throw Errors.VALIDATION(details)`
 *      (already creates a new instance, no need for throwError)
 */
export const Errors = {
  // Auth
  UNAUTHORIZED: new AppError('UNAUTHORIZED', 401, 'Vui lòng đăng nhập'),
  FORBIDDEN: new AppError('FORBIDDEN', 403, 'Không có quyền truy cập'),
  EMAIL_EXISTS: new AppError('EMAIL_EXISTS', 409, 'Email đã được sử dụng'),
  INVALID_CREDENTIALS: new AppError('INVALID_CREDENTIALS', 401, 'Email hoặc mật khẩu không đúng'),

  // Events
  ALREADY_PUBLISHED: new AppError('ALREADY_PUBLISHED', 400, 'Sự kiện đã xuất bản'),
  NO_SEATS: new AppError('NO_SEATS', 400, 'Không có ghế trống để xuất bản'),
  EVENT_NOT_DRAFT: new AppError('EVENT_NOT_DRAFT', 409, 'Chỉ được sửa khi ở trạng thái Draft'),

  // General
  NOT_FOUND: new AppError('NOT_FOUND', 404, 'Không tìm thấy'),

  // Validation (factory — accepts dynamic details)
  VALIDATION: (details?: Record<string, string>) =>
    new AppError('VALIDATION_ERROR', 400, 'Dữ liệu không hợp lệ', details),
} as const;

/**
 * Throws a **clone** of a static error singleton from `Errors`.
 * This prevents mutating the original singleton when overriding message/details.
 *
 * When to use each pattern:
 *
 * | Pattern                              | When to use                                    |
 * |--------------------------------------|------------------------------------------------|
 * | `throwError(Errors.UNAUTHORIZED)`    | Static errors — no dynamic data needed         |
 * | `throwError(Errors.NOT_FOUND, '...')`| Static errors — override message at call site  |
 * | `throw Errors.VALIDATION(details)`   | Factory errors — pass dynamic data directly    |
 * | `throw new AppError(...)`            | One-off errors that don't fit the catalog      |
 *
 * @param error   - A static AppError singleton from `Errors`
 * @param message - Optional override message (defaults to the singleton's message)
 * @param details - Optional override details (defaults to the singleton's details)
 */
export function throwError(
  error: AppError,
  message?: string,
  details?: Record<string, string>,
): never {
  throw new AppError(
    error.code,
    error.statusCode,
    message || error.message,
    details ?? error.details,
  );
}
