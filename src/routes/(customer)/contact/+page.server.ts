import { config } from '$lib/server/config';
import { contactFormLimiter } from '$lib/server/rate-limiter';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.email('Email không hợp lệ').trim(),
  subject: z.string().trim().min(1, 'Vui lòng nhập tiêu đề'),
  message: z.string().trim().min(10, 'Nội dung quá ngắn (tối thiểu 10 ký tự)'),
});

export const actions = {
  default: async ({ request, getClientAddress }) => {
    const ip = getClientAddress();
    const { success: allowed } = await contactFormLimiter.limit(ip);
    if (!allowed) {
      return fail(429, {
        success: false,
        error: 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
      });
    }

    const data = await request.formData();
    const raw = Object.fromEntries(data) as Record<string, string>;

    // Honeypot — silently accept
    if (raw._hp) {
      return { success: true };
    }

    // Time check from hidden field — only blocks actual bots that fill forms instantly
    const _time = Number(raw._time ?? 0);
    const diff = Date.now() - _time;
    if (diff >= 0 && diff < 2000) {
      return fail(400, { success: false, error: 'Gửi quá nhanh, vui lòng thử lại.' });
    }

    // Validation with Zod (trim transforms handle whitespace)
    const result = contactSchema.safeParse(raw);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return fail(400, {
        success: false,
        errors: fieldErrors,
        values: { name: raw.name, email: raw.email, subject: raw.subject, message: raw.message },
      });
    }

    const { name, email, subject, message } = result.data;

    // Submit to Web3Forms
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: config.web3formsKey,
          name,
          email,
          subject,
          message,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await res.json();

      if (!res.ok || !json.success) {
        return fail(502, {
          success: false,
          error: json.message || 'Gửi thất bại, vui lòng thử lại.',
        });
      }

      return { success: true };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return fail(504, { success: false, error: 'Yêu cầu hết thời gian chờ, vui lòng thử lại.' });
      }
      return fail(500, { success: false, error: 'Lỗi máy chủ, vui lòng thử lại.' });
    }
  },
} satisfies Actions;
