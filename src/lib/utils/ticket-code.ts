// src/lib/utils/ticket-code.ts

/**
 * Generates a unique ticket code in the format: TIX-XXXXXX
 * where X is an uppercase alphanumeric character (0-9, A-Z).
 *
 * Uses crypto.getRandomValues for cryptographically strong randomness,
 * avoiding the weak Math.random() approach used in seed files.
 *
 * @param length - Number of random characters after "TIX-" (default: 8)
 * @returns A ticket code string, e.g. "TIX-A3F8K2B9"
 */
const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PREFIX = 'TIX-';

export function generateTicketCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = PREFIX;
  for (let i = 0; i < length; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

/**
 * Generates a batch of unique ticket codes.
 * Codes are guaranteed unique within the returned batch.
 *
 * @param count - Number of codes to generate
 * @param length - Characters after prefix (default: 8)
 * @returns Array of unique ticket code strings
 */
export function generateTicketCodes(count: number, length = 8): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateTicketCode(length));
  }
  return Array.from(codes);
}
