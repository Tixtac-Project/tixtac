import { config } from '$lib/server/config';
import { contactFormLimiter } from '$lib/server/rate-limiter';
import { contactSchema } from '$lib/shared/schemas/contact.schema';
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const _adapter = zod4(contactSchema);

export const load: PageServerLoad = async () => {
  const form = await superValidate(_adapter);
  return { form };
};

export const actions = {
  default: async ({ request, getClientAddress }) => {
    const ip = getClientAddress();
    let allowed: boolean;
    try {
      ({ success: allowed } = await contactFormLimiter.limit(ip));
    } catch {
      return message(await superValidate(_adapter), 'Hệ thống đang bận, vui lòng thử lại sau.', {
        status: 503,
      });
    }
    if (!allowed) {
      return message(
        await superValidate(_adapter),
        'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
        { status: 429 },
      );
    }

    const data = await request.formData();
    const raw = Object.fromEntries(data) as Record<string, string>;

    // Honeypot — silently accept
    if (raw._hp) {
      return message(await superValidate(_adapter), 'Đã gửi thành công!');
    }

    // Time check from hidden field — only blocks actual bots that fill forms instantly
    const _time = Number(raw._time ?? 0);
    const diff = Date.now() - _time;
    if (diff >= 0 && diff < 2000) {
      return message(await superValidate(_adapter), 'Gửi quá nhanh, vui lòng thử lại.', {
        status: 400,
      });
    }

    // Superforms handles Zod validation automatically
    const form = await superValidate(data, _adapter);
    if (!form.valid) {
      return fail(400, { form });
    }

    const { name, email, subject, message: msg } = form.data;

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
          message: msg,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      const json = await res.json();

      if (!res.ok || !json.success) {
        return message(form, (json.message as string) || 'Gửi thất bại, vui lòng thử lại.', {
          status: 502,
        });
      }

      return message(form, 'Đã gửi thành công!');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return message(form, 'Yêu cầu hết thời gian chờ, vui lòng thử lại.', { status: 504 });
      }
      return message(form, 'Lỗi máy chủ, vui lòng thử lại.', { status: 500 });
    }
  },
} satisfies Actions;
