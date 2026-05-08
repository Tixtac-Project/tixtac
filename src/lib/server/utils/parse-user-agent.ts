export function parseUserAgent(ua: string): string {
  if (!ua) return 'Không xác định';

  let os = '';
  let browser = '';

  // OS detection
  const androidMatch = ua.match(/android\s([\d.]+)/i);
  if (androidMatch) os = `Android ${androidMatch[1]}`;
  else if (/iphone|ipad|ipod/i.test(ua)) {
    const iosMatch = ua.match(/os\s([\d_]+)/i);
    os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/cros/i.test(ua)) os = 'Chrome OS';
  else if (/mac os x/i.test(ua)) {
    const macMatch = ua.match(/mac os x\s?([\d_]+)/i);
    os = macMatch ? `macOS ${macMatch[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/linux/i.test(ua)) os = 'Linux';

  // Browser detection
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/edge/i.test(ua)) browser = 'Edge Legacy';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/yabrowser/i.test(ua)) browser = 'Yandex';
  else if (/vivaldi/i.test(ua)) browser = 'Vivaldi';
  else if (/coc_coc_browser/i.test(ua)) browser = 'Cốc Cốc';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/crios/i.test(ua))
    browser = 'Chrome'; // Chrome on iOS
  else if (/fxios/i.test(ua))
    browser = 'Firefox'; // Firefox on iOS
  else if (/chrome|chromium/i.test(ua)) {
    const v = ua.match(/(?:chrome|chromium)\/([\d]+)/i);
    browser = v ? `Chrome ${v[1]}` : 'Chrome';
  } else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  if (os && browser) return `${os} • ${browser}`;
  if (os) return os;
  if (browser) return browser;
  return 'Không xác định';
}
