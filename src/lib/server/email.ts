import { config } from '$lib/server/config';
import { Resend } from 'resend';

const resend = new Resend(config.resendApiKey);

export async function sendResetPasswordEmail(to: string, resetLink: string) {
  await resend.emails.send({
    from: 'onboarding@resend.dev', // ⚠️ dùng cái này trước
    to,
    subject: 'Đặt lại mật khẩu',
    html: `
      <h1>Reset Password</h1>
      <p>Click vào link bên dưới:</p>
      <a href="${resetLink}">Reset password</a>
    `,
    text: `Reset password: ${resetLink}`,
  });
}
