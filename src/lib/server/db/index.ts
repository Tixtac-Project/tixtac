import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('❌ DATABASE_URL không tồn tại trong file .env');
}

export const db = drizzle(connectionString, { schema });
