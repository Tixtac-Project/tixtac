let DATABASE_URL: string;
try {
  DATABASE_URL = (await import('$env/static/private')).DATABASE_URL;
} catch {
  DATABASE_URL = process.env.DATABASE_URL!;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required (set in .env or environment)');
  }
}

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });
