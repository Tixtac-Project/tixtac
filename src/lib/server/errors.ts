// src/lib/server/errors.ts
// Lớp lỗi tùy chỉnh cho ứng dụng
// Mỗi lỗi sẽ có mã lỗi (code), mã trạng thái HTTP (statusCode) và thông điệp (message)
// Các lỗi được định nghĩa sẵn trong đối tượng Errors để dễ sử dụng trong toàn bộ ứng dụng
// Ví dụ: throw throwError(Errors.UNAUTHORIZED) để ném lỗi không được phép truy cập
// Lưu ý: mỗi lần throw cần tạo instance mới của AppError để tránh lỗi bị ghi đè thông tin

export class AppError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, statusCode: number, message?: string) {
    super(message || code);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const Errors = {
  // Auth
  UNAUTHORIZED: new AppError('UNAUTHORIZED', 401, 'Vui lòng đăng nhập'),
  FORBIDDEN: new AppError('FORBIDDEN', 403, 'Không có quyền truy cập'),
  EMAIL_EXISTS: new AppError('EMAIL_EXISTS', 409, 'Email đã được sử dụng'),
  INVALID_CREDENTIALS: new AppError('INVALID_CREDENTIALS', 401, 'Email hoặc mật khẩu không đúng'),

  // Booking
  SEAT_CONFLICT: new AppError('SEAT_CONFLICT', 409, 'Ghế đã được người khác chọn'),
  LOCK_EXPIRED: new AppError('LOCK_EXPIRED', 410, 'Hết thời gian giữ chỗ'),
  ORDER_NOT_OWNED: new AppError('ORDER_NOT_OWNED', 403, 'Đơn hàng không thuộc về bạn'),
  ORDER_NOT_PENDING: new AppError(
    'ORDER_NOT_PENDING',
    400,
    'Đơn hàng không ở trạng thái chờ thanh toán',
  ),

  // Queue
  QUEUE_REQUIRED: new AppError('QUEUE_REQUIRED', 403, 'Vui lòng xếp hàng'),
  QUEUE_NOT_FOUND: new AppError('QUEUE_NOT_FOUND', 404, 'Không tìm thấy vị trí trong hàng chờ'),

  // General
  NOT_FOUND: new AppError('NOT_FOUND', 404, 'Không tìm thấy'),
  VALIDATION: new AppError('VALIDATION_ERROR', 400, 'Dữ liệu không hợp lệ'),
} as const;

// Helper: clone error (vì mỗi throw cần instance mới)
export function throwError(error: AppError, customMessage?: string): never {
  throw new AppError(error.code, error.statusCode, customMessage || error.message);
}
