// src/lib/server/config.ts
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { z } from 'zod';

// Schema: single source of truth for env validation + type coercion
const envSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  SEAT_LOCK_DURATION: z.coerce.number().int().positive().default(600),
  // Per-event dynamic cap configuration
  QUEUE_DEFAULT_EVENT_CAP: z.coerce.number().int().positive().default(10),
  QUEUE_MAX_EVENT_CAP: z.coerce.number().int().positive().default(200),
  QUEUE_DYNAMIC_CAP_RATIO: z.coerce.number().positive().max(1).default(0.1),
  QUEUE_WAITING_CAP_RATIO: z.coerce.number().positive().default(2),
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
  EMAIL_FROM: z.email().default('no-reply@tixtac.io.vn'),
  SUPPORT_EMAIL: z.email().default('support@tixtac.io.vn'),
  APP_URL: z.url().default('https://tixtac.io.vn'),
  GEO_API_KEY: z.string().default(''),
  WEB3FORMS_KEY: z.string().default('2fe33d39-dd60-4a96-8beb-3b807daf571e'),
  RESET_TOKEN_SECRET: z.string().min(1, 'RESET_TOKEN_SECRET is required'),
})
.superRefine((value, ctx) => {
  if (value.QUEUE_DEFAULT_EVENT_CAP > value.QUEUE_MAX_EVENT_CAP) {
    ctx.addIssue({
      code: 'custom',
      path: ['QUEUE_DEFAULT_EVENT_CAP'],
      message: 'QUEUE_DEFAULT_EVENT_CAP must be <= QUEUE_MAX_EVENT_CAP',
    });
  }
});

// Parse & validate (fail fast in ALL environments)
const result = envSchema.safeParse({
  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
  SEAT_LOCK_DURATION: env.SEAT_LOCK_DURATION,
  QUEUE_DEFAULT_EVENT_CAP: env.QUEUE_DEFAULT_EVENT_CAP,
  QUEUE_MAX_EVENT_CAP: env.QUEUE_MAX_EVENT_CAP,
  QUEUE_DYNAMIC_CAP_RATIO: env.QUEUE_DYNAMIC_CAP_RATIO,
  QUEUE_WAITING_CAP_RATIO: env.QUEUE_WAITING_CAP_RATIO,
  ACCESS_TOKEN_DURATION: env.ACCESS_TOKEN_DURATION,
  CLOUDAMQP_URL: env.CLOUDAMQP_URL,
  UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
  ENABLE_QUEUE_WORKER: env.ENABLE_QUEUE_WORKER,
  ENABLE_BACKGROUND_WORKERS: env.ENABLE_BACKGROUND_WORKERS,
  RESEND_API_KEY: env.RESEND_API_KEY,
  EMAIL_FROM: env.EMAIL_FROM,
  SUPPORT_EMAIL: env.SUPPORT_EMAIL,
  APP_URL: env.APP_URL,
  GEO_API_KEY: env.GEO_API_KEY,
  WEB3FORMS_KEY: env.WEB3FORMS_KEY,
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
  /** Per-event queue cap fallback when dynamic cap hasn't been computed yet */
  queueDefaultEventCap: parsed.QUEUE_DEFAULT_EVENT_CAP,
  /** Hard ceiling for per-event dynamic cap */
  queueMaxEventCap: parsed.QUEUE_MAX_EVENT_CAP,
  /** Fraction of remaining seats used to compute dynamic cap (e.g. 0.1 = 10%).
   *
   * Recommended range: 0.05 – 0.30
   *  - 0.05 (5%) : Very conservative. Good for high-demand events. Fewer users
   *                compete for the last seats, but queue moves slower.
   *  - 0.10 (10%): Default. Balanced throttle for most events.
   *  - 0.30 (30%): Loose throttle. Still 3× more users than seats, so late-stage
   *                conflicts are possible but load is still controlled.
   *  - 1.00 (100%): cap = remainingSeats → NO throttle effect. Avoid.
   *
   * cap = min(QUEUE_MAX_EVENT_CAP, ceil(remaining * ratio))
   * When remaining < LOW_SEATS_THRESHOLD (20), the cache TTL drops to 30s
   * so the cap reacts faster to late-stage purchases.
   */
  queueDynamicCapRatio: parsed.QUEUE_DYNAMIC_CAP_RATIO,
  /** Multiplier for the active cap to determine the waiting list limit.
   * Total waiting slots = ceil(active_cap * queueWaitingCapRatio)
   */
  queueWaitingCapRatio: parsed.QUEUE_WAITING_CAP_RATIO,
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
  /** Email address for the "From" field in outgoing emails (includes display name) */
  emailFrom: `TixTac <${parsed.EMAIL_FROM}>`,
  /** Support email address for handling user inquiries */
  supportEmail: parsed.SUPPORT_EMAIL,
  /** Base URL of the app, used for constructing links in emails (e.g. password reset) */
  appUrl: parsed.APP_URL,
  /** ipgeolocation.io API key (optional — when set, password reset emails include city/country) */
  geoApiKey: parsed.GEO_API_KEY,
  /** Web3Forms access key for contact form (can be public — domain-restricted) */
  web3formsKey: parsed.WEB3FORMS_KEY,
  /** Secret for signing password reset tokens */
  resetTokenSecret: parsed.RESET_TOKEN_SECRET,
} as const;
