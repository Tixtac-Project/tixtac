import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET must be a non-empty string'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SEAT_LOCK_DURATION: z.string().default('600'),
  MAX_CONCURRENT_USERS: z.string().default('200'),
  ACCESS_TOKEN_DURATION: z.string().default('300'),
});

type EnvConfig = z.infer<typeof envSchema>;

let rawConfig: EnvConfig;

try {
  rawConfig = envSchema.parse(process.env);
} catch (error) {
  const message =
    error instanceof z.ZodError
      ? error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
      : String(error);

  console.error('Environment configuration error:', message);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  // Fallback for development with defaults
  rawConfig = {
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    SEAT_LOCK_DURATION: process.env.SEAT_LOCK_DURATION || '600',
    MAX_CONCURRENT_USERS: process.env.MAX_CONCURRENT_USERS || '200',
    ACCESS_TOKEN_DURATION: process.env.ACCESS_TOKEN_DURATION || '300',
  };
}

export const config = {
  ...rawConfig,
  seatLockDuration: parseInt(rawConfig.SEAT_LOCK_DURATION, 10),
  maxConcurrentUsers: parseInt(rawConfig.MAX_CONCURRENT_USERS, 10),
  accessTokenDuration: parseInt(rawConfig.ACCESS_TOKEN_DURATION, 10),
};
