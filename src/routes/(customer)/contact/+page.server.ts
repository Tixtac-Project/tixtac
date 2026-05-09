import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

const WEB3FORMS_KEY = process.env.WEB3FORMS_KEY;
if (!WEB3FORMS_KEY) {
  console.error('WEB3FORMS_KEY environment variable is not set');
}

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString() ?? '';
    const email = data.get('email')?.toString() ?? '';
    const subject = data.get('subject')?.toString() ?? '';
    const message = data.get('message')?.toString() ?? '';
    const botcheck = data.get('_hp')?.toString() ?? '';

    // Honeypot — silently accept
    if (botcheck) {
      return { success: true };
    }

    // Time check from hidden field
    const _time = Number(data.get('_time') ?? 0);
    if (Date.now() - _time < 2000) {
      return fail(400, { success: false, error: 'Gửi quá nhanh, vui lòng thử lại.' });
    }

    // Validation
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Vui lòng nhập họ tên';
    if (!email.trim()) errors.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email không hợp lệ';
    if (!subject.trim()) errors.subject = 'Vui lòng nhập tiêu đề';
    if (!message.trim()) errors.message = 'Vui lòng nhập nội dung';
    else if (message.trim().length < 10) errors.message = 'Nội dung quá ngắn (tối thiểu 10 ký tự)';

    if (Object.keys(errors).length > 0) {
      return fail(400, { success: false, errors, values: { name, email, subject, message } });
    }

    // Submit to Web3Forms
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
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
