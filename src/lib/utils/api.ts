type FetchFn = typeof fetch;

type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string; code?: string };

export async function api<T>(
  fetch: FetchFn,
  url: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        data: null,
        error: body?.error || `Lỗi ${res.status}`,
        code: body?.code,
      };
    }

    return {
      data: body?.data ?? body,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: 'Không thể kết nối đến server',
    };
  }
}

// Shorthand helpers

export function apiGet<T>(fetch: FetchFn, url: string) {
  return api<T>(fetch, url);
}

export function apiPost<T>(fetch: FetchFn, url: string, body: unknown) {
  return api<T>(fetch, url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
