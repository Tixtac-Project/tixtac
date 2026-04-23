// src/lib/utils/api.ts
import { browser } from '$app/environment';
import { toast } from '$lib/stores/toast';
import { redirect } from '@sveltejs/kit';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const DEFAULT_TIMEOUT = 15_000;

type ApiResponse<T> = {
  data?: T;
  error?: string;
  /** Field-level validation errors returned by the server (code: VALIDATION_ERROR) */
  details?: Record<string, string>;
  status: number;
};

interface ApiOptions {
  silent?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
}

// ── Chống spam redirect khi nhiều request 401 đồng thời ──
let isRedirectingToLogin = false;

async function fetchWrapper<T>(
  endpoint: string,
  init: RequestInit,
  customOptions?: ApiOptions,
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  // ── Timeout ──
  const controller = new AbortController();
  const timeout = customOptions?.timeout ?? DEFAULT_TIMEOUT;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // ── Merge headers ──
  const headers = {
    ...((init.headers as Record<string, string>) ?? {}),
    ...(customOptions?.headers ?? {}),
  };

  try {
    const res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      signal: customOptions?.signal ?? controller.signal,
    });
    clearTimeout(timeoutId);

    // ── Parse response body an toàn ──
    const text = await res.text();
    const json = text
      ? (() => {
          try {
            return JSON.parse(text);
          } catch {
            return {};
          }
        })()
      : {};

    if (!res.ok) {
      const errorObj = json.error && typeof json.error === 'object' ? json.error : null;
      const errorMessage: string =
        (typeof json.error === 'string' ? json.error : errorObj?.message) ||
        json.message ||
        'Có lỗi xảy ra từ hệ thống';

      // Extract field-level details from error responses (VALIDATION_ERROR, CART_CONFLICT, etc.)
      const details: Record<string, string> | undefined =
        errorObj?.details && typeof errorObj.details === 'object' ? errorObj.details : undefined;

      // 401 — Hết hạn session
      if (res.status === 401 && browser && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        toast.error('Phiên đăng nhập đã hết hạn.');
        await redirect(302, '/login');
        setTimeout(() => {
          isRedirectingToLogin = false;
        }, 2_000);
        return { error: errorMessage, status: 401 };
      }

      // 5xx — Lỗi server
      if (res.status >= 500) {
        toast.error('Lỗi máy chủ, vui lòng thử lại sau.');
        return { error: errorMessage, status: res.status };
      }

      // 4xx — Business logic errors
      if (!customOptions?.silent) {
        toast.error(errorMessage);
      }
      return { error: errorMessage, details, status: res.status };
    }

    // ── Success ──
    // Hỗ trợ cả { data: ... } lẫn response trả trực tiếp
    const data = (json.data !== undefined ? json.data : json) as T;
    return { data, status: res.status };
  } catch (err) {
    clearTimeout(timeoutId);

    // Timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      const msg = 'Yêu cầu đã hết thời gian chờ.';
      if (!customOptions?.silent) toast.error(msg);
      return { error: msg, status: 0 };
    }

    // Network / CORS / Server sập
    const msg = 'Không thể kết nối đến máy chủ. Kiểm tra lại mạng.';
    if (!customOptions?.silent) toast.error(msg);
    return { error: msg, status: 0 };
  }
}

// ── Helper tạo body + headers ──
function buildBody(body: unknown): { headers: Record<string, string>; body: BodyInit } {
  if (body instanceof FormData) {
    return { headers: {}, body }; // Để browser tự set Content-Type
  }
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ── Public API ──
export const api = {
  get: <T>(url: string, opts?: ApiOptions) => fetchWrapper<T>(url, { method: 'GET' }, opts),

  post: <T>(url: string, body: unknown, opts?: ApiOptions) => {
    const { headers, body: reqBody } = buildBody(body);
    return fetchWrapper<T>(url, { method: 'POST', headers, body: reqBody }, opts);
  },

  put: <T>(url: string, body: unknown, opts?: ApiOptions) => {
    const { headers, body: reqBody } = buildBody(body);
    return fetchWrapper<T>(url, { method: 'PUT', headers, body: reqBody }, opts);
  },

  patch: <T>(url: string, body: unknown, opts?: ApiOptions) => {
    const { headers, body: reqBody } = buildBody(body);
    return fetchWrapper<T>(url, { method: 'PATCH', headers, body: reqBody }, opts);
  },

  delete: <T>(url: string, opts?: ApiOptions) => fetchWrapper<T>(url, { method: 'DELETE' }, opts),
};
