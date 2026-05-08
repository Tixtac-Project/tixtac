import ResetPassword from '$lib/emails/ResetPassword.svelte';
import { config } from '$lib/server/config';
import { Renderer, toPlainText } from '@better-svelte-email/server';
import { Resend } from 'resend';

const { render } = new Renderer();
const resend = new Resend(config.resendApiKey);

function maskIp(ip: string): string {
  if (!ip) return '';
  // IPv4: mask last octet  →  192.168.1.xxx
  if (ip.includes('.')) return ip.replace(/\.\d+$/, '.xxx');
  // IPv6: mask last hextet →  ::1:xxxx
  return ip.replace(/:[^:]*$/, ':xxxx');
}

async function geolocate(ip: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.ipgeolocation.io/ipgeo?apiKey=${config.geoApiKey}&ip=${ip}&fields=country_name,city`,
    );
    if (!res.ok) return '';
    const { city, country_name } = await res.json();
    return city ? `${city}, ${country_name}` : country_name || '';
  } catch {
    return '';
  }
}

export async function sendResetPasswordEmail(
  to: string,
  rawToken: string,
  ip: string,
  device: string,
) {
  const resetLink = `${config.appUrl}/reset-password?token=${rawToken}`;

  // Optional enrichment (non-blocking — silently skip on failure)
  const [location, displayIp] = await Promise.all([
    config.geoApiKey ? geolocate(ip) : '',
    Promise.resolve(maskIp(ip)),
  ]);

  const html = await render(ResetPassword, {
    props: {
      resetLink,
      supportEmail: config.supportEmail,
      ip: displayIp,
      location,
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
