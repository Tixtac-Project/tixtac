import { config } from '$lib/server/config';

export function generateResetToken() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Buffer.from(randomBytes).toString('base64url');

  const hmacToken = new Bun.CryptoHasher('sha256', config.resetTokenSecret)
    .update(rawToken)
    .digest('hex');

  return { rawToken, hmacToken };
}

export function hashExistingToken(rawToken: string) {
  return new Bun.CryptoHasher('sha256', config.resetTokenSecret).update(rawToken).digest('hex');
}
