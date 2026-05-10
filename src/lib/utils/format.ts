/**
 * Format a 12-character normalized check-in secret into XXXX-XXXX-XXXX.
 */
export function formatCheckinSecret(secret: string): string {
  if (secret.length !== 12) return secret; // fallback
  return `${secret.slice(0, 4)}-${secret.slice(4, 8)}-${secret.slice(8, 12)}`;
}

/**
 * Remove hyphens and uppercase a formatted secret to get the normalized version.
 */
export function normalizeCheckinSecret(formatted: string): string {
  return formatted.replace(/-/g, '').toUpperCase();
}
