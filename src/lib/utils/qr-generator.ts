import type { TicketQrPayload } from '$lib/types/qr';
import { qrcode } from 'etiket';

/**
 * Generate a scanner-optimized QR code SVG for event ticket check-in.
 *
 * @param payload - The minimal ticket QR payload `{v, e, s, k}`.
 * @param size - Output SVG width/height in pixels (default 200).
 * @returns SVG markup string safe for Svelte `{@html}` rendering.
 */
export function generateTicketQrSvg(payload: TicketQrPayload, size = 200): string {
  const json = JSON.stringify(payload);
  return qrcode(json, {
    size,
    ecLevel: 'M',
    dotType: 'rounded',
  });
}

/**
 * Build a {@link TicketQrPayload} from individual ticket fields.
 * Normalizes the check-in secret (removes hyphens, uppercase, 12 chars max).
 *
 * @param eventId - The event database ID.
 * @param showId - The show database ID.
 * @param checkinSecret - Raw or normalized 12-char check-in secret.
 * @returns A payload conforming to the minimal QR standard.
 */
export function buildQrPayload(
  eventId: number,
  showId: number,
  checkinSecret: string,
): TicketQrPayload {
  return {
    v: 1,
    e: eventId,
    s: showId,
    k: checkinSecret.replace(/-/g, '').toUpperCase().slice(0, 12),
  };
}

/**
 * Format a 12-character normalized check-in secret to the human-readable
 * `XXXX-XXXX-XXXX` form used for offline manual entry.
 *
 * @example
 * formatCheckinSecret('K7M9Q2XP8VRA') // 'K7M9-Q2XP-8VRA'
 *
 * @param secret - Normalized 12-character secret (no hyphens).
 * @returns Formatted string, or the original value if length ≠ 12.
 */
export function formatCheckinSecret(secret: string): string {
  const normalized = secret.replace(/-/g, '').toUpperCase();
  if (normalized.length !== 12) return secret;
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}`;
}
