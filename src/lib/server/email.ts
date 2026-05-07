// src/lib/server/email.ts
import ResetPassword from '$lib/emails/ResetPassword.svelte';
import { config } from '$lib/server/config';
import { Renderer } from '@better-svelte-email/server';
import { Resend } from 'resend';

// Tạo instance Renderer (khởi tạo 1 lần)
const renderer = new Renderer();
const resend = new Resend(config.resendApiKey);

export async function sendResetPasswordEmail(to: string, rawToken: string) {
  const resetLink = `${config.appUrl}/reset-password?token=${rawToken}`;

  // Render component → HTML
  const html = await renderer.render(ResetPassword, {
    props: { resetLink },
  });

  // Phần text thuần (tuỳ chọn)
  const { toPlainText } = await import('@better-svelte-email/server');
  const plainText = toPlainText(html);

  await resend.emails.send({
    from: config.emailFrom,
    to,
    subject: 'Đặt lại mật khẩu',
    html,
    text: plainText,
  });
}
