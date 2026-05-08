import ResetPassword from '$lib/emails/ResetPassword.svelte';
import { config } from '$lib/server/config';
import { Renderer, toPlainText } from '@better-svelte-email/server';
import { Resend } from 'resend';

const { render } = new Renderer();
const resend = new Resend(config.resendApiKey);

export async function sendResetPasswordEmail(
  to: string,
  rawToken: string,
  ip: string,
  device: string,
) {
  const resetLink = `${config.appUrl}/reset-password?token=${rawToken}`;

  const html = await render(ResetPassword, {
    props: {
      resetLink,
      supportEmail: config.supportEmail,
      ip,
      device,
    },
  });

  await resend.emails.send({
    from: config.emailFrom,
    to,
    subject: 'Đặt lại mật khẩu',
    html,
    text: toPlainText(html),
  });
}
