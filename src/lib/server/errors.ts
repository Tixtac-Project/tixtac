// src/lib/server/errors.ts

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, string>; // Ép kiểu cụ thể để Frontend dễ dùng

  constructor(code: string, statusCode: number, message?: string, details?: any) {
    super(message || code);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const Errors = {
  // Auth
  UNAUTHORIZED: new AppError('UNAUTHORIZED', 401, 'Vui lòng đăng nhập'),
  FORBIDDEN: new AppError('FORBIDDEN', 403, 'Không có quyền truy cập'),
  EMAIL_EXISTS: new AppError('EMAIL_EXISTS', 409, 'Email đã được sử dụng'),
  INVALID_CREDENTIALS: new AppError('INVALID_CREDENTIALS', 401, 'Email hoặc mật khẩu không đúng'),

  // General
  NOT_FOUND: new AppError('NOT_FOUND', 404, 'Không tìm thấy'),

  // SỬA Ở ĐÂY: Biến VALIDATION thành một hàm (Factory Function)
  // Để có thể truyền details vào trực tiếp: Errors.VALIDATION(details)
  VALIDATION: (details?: Record<string, string>) =>
    new AppError('VALIDATION_ERROR', 400, 'Dữ liệu không hợp lệ', details),
} as const;

// Helper: dùng để ném các lỗi tĩnh (như UNAUTHORIZED, EMAIL_EXISTS)
export function throwError(error: AppError, customMessage?: string, details?: unknown): never {
  throw new AppError(
    error.code,
    error.statusCode,
    customMessage || error.message,
    details ?? error.details,
  );
}
