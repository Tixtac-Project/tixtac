// src/lib/server/auth/token.ts

export function generateResetToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Buffer.from(bytes).toString('base64url');

  const tokenHash = new Bun.CryptoHasher('sha256').update(rawToken).digest('hex');

  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string) {
  return new Bun.CryptoHasher('sha256').update(rawToken).digest('hex');
}
