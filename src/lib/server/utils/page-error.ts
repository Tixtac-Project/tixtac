import { error, redirect, type Redirect } from '@sveltejs/kit';
import { AppError } from '../errors';

export interface PageErrorContext {
  redirectUrl?: string;
  notFoundMessage?: string;
  defaultMessage?: string;
}

function isRedirect(err: unknown): err is Redirect {
  return (
    err !== null &&
    typeof err === 'object' &&
    'status' in err &&
    typeof (err as Record<string, unknown>).status === 'number' &&
    (err as Redirect).status < 400
  );
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
