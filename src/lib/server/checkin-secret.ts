// src/lib/server/checkin-secret.ts
import crypto from 'node:crypto';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'; // 30 ký tự, không 0,O,1,I,L,U
const SECRET_LENGTH = 12;

/**
 * Generate a cryptographically secure random check-in secret.
 * Returns a 12-character string (normalized, no hyphens).
 */
export function generateCheckinSecret(): string {
  let secret = '';
  for (let i = 0; i < SECRET_LENGTH; i++) {
    const index = crypto.randomInt(ALPHABET.length);
    secret += ALPHABET[index];
  }
  return secret;
}

/**
 * Compute SHA-256 hash of a normalized check-in secret.
 */
export function hashCheckinSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}
