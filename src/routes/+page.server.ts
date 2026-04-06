import { sql } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    // Test kết nối bằng cách lấy thời gian hiện tại từ Postgres
    const result = await sql`SELECT NOW() as now, version() as version`;

    console.log("✅ Neon PostgreSQL Connected!");
    console.log("🕒 DB Time:", result[0].now);

    return {
      status: "Connected",
      dbTime: result[0].now,
      version: result[0].version
    };
  } catch (error) {
    console.error("❌ Neon Connection Failed:", error);
    return {
      status: "Error",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
};
