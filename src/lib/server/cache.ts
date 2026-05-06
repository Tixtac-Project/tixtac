import type { LRU } from 'tiny-lru';
import { lru } from 'tiny-lru';

/**
 * L1 In-Memory LRU Cache
 *
 * Protects RAM with hard cap of 500 entries and 3-minute TTL per entry.
 * TTL resets on update (resetTtl=true) so frequently-accessed keys stay alive.
 */
export const l1Cache: LRU<unknown> = lru(500, 1000 * 60 * 3, true);

/** Standard L2 (Redis) TTL in seconds — 15 minutes */
export const L2_TTL = 900;

/** Rate-limit cooldown for forceRefresh — 30 seconds */
export const REFRESH_COOLDOWN_S = 30;

/** Build a namespaced cache key */
export function cacheKey(scope: string, ...parts: (string | number)[]): string {
  return `tixtac:stats:${scope}:${parts.join(':')}`;
}

/** Build a rate-limit key for forceRefresh */
export function refreshRateLimitKey(adminId: number): string {
  return `tixtac:ratelimit:refresh:${adminId}`;
}
