import * as env from '$env/static/private';
import * as env from '$env/static/private';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function toPositiveInt(name: string, value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid env ${name}: expected positive number`);
  }
  return parsed;
}

export const config = {
  // Database
  databaseUrl: requireEnv('DATABASE_URL', env.DATABASE_URL),

  // Message Queue
  amqpUrl: requireEnv('AMQP_URL', env.AMQP_URL),

  // Auth
  jwtSecret: requireEnv('JWT_SECRET', env.JWT_SECRET),
  jwtExpiresIn: '24h',

  // Business Rules
  seatLockDuration: toPositiveInt('SEAT_LOCK_DURATION', env.SEAT_LOCK_DURATION, 600),        // giây
  maxConcurrentUsers: toPositiveInt('MAX_CONCURRENT_USERS', env.MAX_CONCURRENT_USERS, 200),
  accessTokenDuration: toPositiveInt('ACCESS_TOKEN_DURATION', env.ACCESS_TOKEN_DURATION, 300),   // giây
  queuePollingInterval: 3000,                                      // ms

  // SSE
  sseHeartbeatInterval: 30_000,                                    // ms
} as const;
