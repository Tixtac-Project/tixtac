import * as env from '$env/static/private';

export const config = {
  // Database
  databaseUrl: env.DATABASE_URL,

  // Message Queue
  amqpUrl: env.AMQP_URL,

  // Auth
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: '24h',

  // Business Rules
  seatLockDuration: Number(env.SEAT_LOCK_DURATION || 600),        // giây
  maxConcurrentUsers: Number(env.MAX_CONCURRENT_USERS || 200),
  accessTokenDuration: Number(env.ACCESS_TOKEN_DURATION || 300),   // giây
  queuePollingInterval: 3000,                                      // ms

  // SSE
  sseHeartbeatInterval: 30_000,                                    // ms
} as const;
