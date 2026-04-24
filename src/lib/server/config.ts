// src/lib/server/config.ts
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { z } from 'zod';

// Schema: single source of truth for env validation + type coercion
const envSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  SEAT_LOCK_DURATION: z.coerce.number().int().positive().default(600),
  MAX_CONCURRENT_USERS: z.coerce.number().int().positive().default(200),
  ACCESS_TOKEN_DURATION: z.coerce.number().int().positive().default(300),
  CLOUDAMQP_URL: z.string().min(1, 'CLOUDAMQP_URL is required'),
});

// Parse & validate (fail fast in ALL environments)
const result = envSchema.safeParse({
  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
  SEAT_LOCK_DURATION: env.SEAT_LOCK_DURATION,
  MAX_CONCURRENT_USERS: env.MAX_CONCURRENT_USERS,
  ACCESS_TOKEN_DURATION: env.ACCESS_TOKEN_DURATION,
  CLOUDAMQP_URL: env.AMQP_URL,
});

if (!result.success) {
  const message = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n  • ');

  // Startup error → plain Error, NOT AppError (no HTTP context here)
  throw new Error(`❌ Invalid environment configuration:\n  • ${message}`);
}

const parsed = result.data;

// ─── Export typed, camelCase-only config ───
export const config = {
  /** True in development mode (from SvelteKit's $app/environment) */
  isDev: dev,
  /** JWT signing secret */
  jwtSecret: parsed.JWT_SECRET,
  /** JWT auth token expiration (e.g. '24h', '7d') — passed to jose setExpirationTime() */
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  /** Seat lock duration in seconds */
  seatLockDuration: parsed.SEAT_LOCK_DURATION,
  /** Virtual queue threshold */
  maxConcurrentUsers: parsed.MAX_CONCURRENT_USERS,
  /** Access token lifetime in seconds after queue*/
  accessTokenDuration: parsed.ACCESS_TOKEN_DURATION,

  cloudAMQPURL: parsed.CLOUDAMQP_URL,
} as const;
