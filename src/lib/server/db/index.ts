import { DATABASE_URL } from '$env/static/private';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './schema';

if (!DATABASE_URL) {
  throw new Error('❌ DATABASE_URL không tồn tại trong file .env');
}

export const db = drizzle(DATABASE_URL, { schema });
