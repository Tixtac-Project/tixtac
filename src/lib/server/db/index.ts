import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('❌ DATABASE_URL không tồn tại trong file .env');
}

// Khởi tạo connection pool tới NeonDB
// BẮT BUỘC dùng Pooled Connection String của Neon
const pool = new Pool({
  connectionString: connectionString,
  max: 100,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Export singleton instance của DB
export const db = drizzle(pool, { schema });
