// src/lib/server/rate-limiter.ts
import { config } from '$lib/server/config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: config.upstashUrl,
  token: config.upstashToken,
});

export const forgotPasswordLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});
