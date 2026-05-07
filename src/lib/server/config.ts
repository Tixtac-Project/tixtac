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
  UPSTASH_REDIS_REST_URL: z.string().min(1, 'UPSTASH_REDIS_REST_URL is required'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
  ENABLE_QUEUE_WORKER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  ENABLE_BACKGROUND_WORKERS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().email().min(1, 'EMAIL_FROM is required'),
  APP_URL: dev
    ? z.string().url().default('http://localhost:5173')
    : z.string().url().min(1, 'APP_URL is required'),
  RESET_TOKEN_SECRET: z.string().min(1, 'RESET_TOKEN_SECRET is required'),
});

// Parse & validate (fail fast in ALL environments)
const result = envSchema.safeParse({
  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
  SEAT_LOCK_DURATION: env.SEAT_LOCK_DURATION,
  MAX_CONCURRENT_USERS: env.MAX_CONCURRENT_USERS,
  ACCESS_TOKEN_DURATION: env.ACCESS_TOKEN_DURATION,
  CLOUDAMQP_URL: env.CLOUDAMQP_URL,
  UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
  ENABLE_QUEUE_WORKER: env.ENABLE_QUEUE_WORKER,
  ENABLE_BACKGROUND_WORKERS: env.ENABLE_BACKGROUND_WORKERS,
  RESEND_API_KEY: env.RESEND_API_KEY,
  EMAIL_FROM: env.EMAIL_FROM,
  APP_URL: env.APP_URL,
  RESET_TOKEN_SECRET: env.RESET_TOKEN_SECRET,
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
  /** CloudAMQP connection URL */
  cloudAMQPUrl: parsed.CLOUDAMQP_URL,
  /** Upstash Redis REST URL */
  upstashUrl: parsed.UPSTASH_REDIS_REST_URL,
  /** Upstash Redis REST token */
  upstashToken: parsed.UPSTASH_REDIS_REST_TOKEN,
  /** Whether to start the gatekeeper queue worker loop (default: true) */
  enableQueueWorker: parsed.ENABLE_QUEUE_WORKER,
  /** Whether to start MQ consumers & background workers (default: true) */
  enableBackgroundWorkers: parsed.ENABLE_BACKGROUND_WORKERS,
  /** Resend API key for sending emails */
  resendApiKey: parsed.RESEND_API_KEY,
  /** Email address for the "From" field in outgoing emails */
  emailFrom: parsed.EMAIL_FROM,
  /** Base URL of the app, used for constructing links in emails (e.g. password reset) */
  appUrl: parsed.APP_URL,
  /** Secret for signing password reset tokens */
  resetTokenSecret: parsed.RESET_TOKEN_SECRET,
} as const;
