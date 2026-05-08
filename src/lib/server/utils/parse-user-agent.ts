export function parseUserAgent(ua: string): string {
  if (!ua) return 'Không xác định';

  let os = '';
  let browser = '';

  // Hệ điều hành
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Trình duyệt
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  if (os && browser) return `${os} • ${browser}`;
  if (os) return os;
  if (browser) return browser;
  return ua.slice(0, 60); // fallback an toàn
}
