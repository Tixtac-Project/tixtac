import { config } from '$lib/server/config';

export function generateResetToken() {
  // 1. Sinh chuỗi ngẫu nhiên 32 bytes (chuẩn CSPRNG)
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Buffer.from(randomBytes).toString('base64url');

  // 2. Ký HMAC-SHA256 cực nhanh bằng Bun Native API
  const hmacToken = new Bun.CryptoHasher('sha256', config.jwtSecret).update(rawToken).digest('hex');

  return { rawToken, hmacToken };
}

export function hashExistingToken(rawToken: string) {
  return new Bun.CryptoHasher('sha256', config.jwtSecret).update(rawToken).digest('hex');
}
