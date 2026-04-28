import { Redis } from '@upstash/redis';
import { config } from './config';

export const redis = new Redis({
  url: config.upstashUrl,
  token: config.upstashToken,
});
