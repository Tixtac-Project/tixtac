import { error, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { AppError } from '../errors';

export interface PageErrorContext {
  redirectUrl?: string;
  notFoundMessage?: string;
  defaultMessage?: string;
}

export function handlePageError(err: unknown, context: PageErrorContext = {}): never {
  const {
    redirectUrl,
    notFoundMessage = 'Không tìm thấy trang',
    defaultMessage = 'Đã có lỗi xảy ra',
  } = context;

  if (isRedirect(err)) {
    throw err;
  }

  if (isHttpError(err)) {
    throw err;
  }

  if (err instanceof AppError) {
    if (err.statusCode === 401 && redirectUrl) {
      redirect(302, redirectUrl);
    }
    if (err.statusCode === 404) {
      error(404, notFoundMessage);
    }
    error(err.statusCode, err.message || defaultMessage);
  }

  error(500, defaultMessage);
}
