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
  USER_INACTIVE: new AppError('USER_INACTIVE', 404, 'Không tìm thấy user'),
  INVALID_TOKEN: new AppError('INVALID_TOKEN', 400, 'Token không hợp lệ hoặc đã hết hạn'),

  // Events
  ALREADY_PUBLISHED: new AppError('ALREADY_PUBLISHED', 400, 'Sự kiện đã xuất bản'),
  NO_SEATS: new AppError('NO_SEATS', 400, 'Không có ghế trống để xuất bản'),
  EVENT_NOT_DRAFT: new AppError('EVENT_NOT_DRAFT', 409, 'Chỉ được sửa khi ở trạng thái Draft'),
  EVENT_NOT_AVAILABLE: new AppError('EVENT_NOT_AVAILABLE', 409, 'Sự kiện không hợp lệ'),

  // Orders
  ORDER_NOT_OWNED: new AppError('ORDER_NOT_OWNED', 403, 'Không có quyền với đơn hàng này'),
  ORDER_NOT_PENDING: new AppError(
    'ORDER_NOT_PENDING',
    400,
    'Chỉ có thể thanh toán đơn hàng đang chờ xử lý',
  ),
  ORDER_ALREADY_PROCESSED: new AppError('ORDER_ALREADY_PROCESSED', 400, 'Đơn hàng đã được xử lý'),
  LOCK_EXPIRED: new AppError('LOCK_EXPIRED', 410, 'Đơn hàng đã hết hạn, vui lòng đặt lại vé'),
  ORDER_EMPTY: new AppError('ORDER_EMPTY', 400, 'Đơn hàng không có vé nào'),
  ACTIVE_ORDER_EXISTS: new AppError(
    'ACTIVE_ORDER_EXISTS',
    409,
    'Bạn đang có đơn hàng đang chờ xử lý',
  ),

  // Seats
  SEAT_NOT_AVAILABLE: new AppError('SEAT_NOT_AVAILABLE', 409, 'Một hoặc nhiều ghế đã được đặt'),
  SALES_NOT_STARTED: new AppError('SALES_NOT_STARTED', 400, 'Chưa đến thời gian mở bán'),
  SALES_ENDED: new AppError('SALES_ENDED', 400, 'Đã hết thời gian bán vé'),
  MAX_TICKETS_EXCEEDED: new AppError(
    'MAX_TICKETS_EXCEEDED',
    400,
    'Vượt quá số lượng vé tối đa cho phép',
  ),
  HOLD_FAILED: new AppError('HOLD_FAILED', 500, 'Không thể giữ ghế, vui lòng thử lại'),
  SEATS_LIST_EMPTY: new AppError('SEATS_LIST_EMPTY', 400, 'Danh sách ghế không được để trống'),
  MAX_SEATS_EXCEEDED: new AppError(
    'MAX_SEATS_EXCEEDED',
    400,
    'Vượt quá số lượng ghế tối đa cho phép',
  ),
  INVALID_SECTION_TYPE: new AppError('INVALID_SECTION_TYPE', 400, 'Ghế không thuộc đúng khu'),
  DUPLICATE_SEAT: new AppError('DUPLICATE_SEAT', 400, 'Ghế bị trùng'),
  INVALID_QUANTITY: new AppError('INVALID_QUANTITY', 400, 'Số lượng ghế đứng không hợp lệ'),
  SECTION_NOT_AVAILABLE: new AppError('SECTION_NOT_AVAILABLE', 409, 'Khu ghế không hợp lệ'),

  // Shows
  SHOW_NOT_AVAILABLE: new AppError('SHOW_NOT_AVAILABLE', 409, 'Xuất diễn không hợp lệ'),
  DUPLICATE_SHOW: new AppError('DUPLICATE_SHOW', 400, 'Suất diễn bị trùng'),

  // Idempotency
  IDEMPOTENCY_CONFLICT: new AppError(
    'IDEMPOTENCY_CONFLICT',
    409,
    'Yêu cầu idempotency đang xung đột',
  ),

  // MQ
  MQ_UNAVAILABLE: new AppError('MQ_UNAVAILABLE', 503, 'Hệ thống tạm thời bận, vui lòng thử lại.'),

  // Virtual Queue
  QUEUE_SESSION_EXPIRED: new AppError(
    'QUEUE_SESSION_EXPIRED',
    410,
    'Phiên hàng chờ đã hết hạn hoặc không tồn tại',
  ),
  QUEUE_ALREADY_JOINED: new AppError(
    'QUEUE_ALREADY_JOINED',
    409,
    'Bạn đang tham gia hàng chờ của một sự kiện khác',
  ),

  // General
  NOT_FOUND: new AppError('NOT_FOUND', 404, 'Không tìm thấy'),
  INTERNAL_ERROR: new AppError('INTERNAL_ERROR', 500, 'Đã có lỗi xảy ra, vui lòng thử lại'),
  INVALID_ID: new AppError('INVALID_ID', 400, 'ID không hợp lệ'),
  BAD_REQUEST: new AppError('BAD_REQUEST', 400, 'Yêu cầu không hợp lệ'),

  // Validation (factory — accepts dynamic details)
  VALIDATION: (details?: Record<string, string>) =>
    new AppError('VALIDATION_ERROR', 400, 'Dữ liệu không hợp lệ', details),

  CART_CONFLICT: (details?: Record<string, string>) =>
    new AppError(
      'CART_CONFLICT',
      409,
      'Một số vé trong giỏ hàng đã bị người khác mua hoặc không đủ số lượng',
      details,
    ),
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
