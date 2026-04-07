import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { DATABASE_URL } from '$env/static/private';

// 1. Tạo client kết nối raw SQL
const sql = neon(DATABASE_URL);

// 2. Khởi tạo Drizzle instance
export const db = drizzle(sql);

// Export thêm sql để dùng cho các câu query raw nếu cần test nhanh
export { sql };
