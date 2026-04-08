import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { publishTestMessage } from '$lib/server/mq/connection';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  let dbStatus = { ok: false, time: '' };
  let mqStatus: { ok: boolean; error: string };

  // 1. Test Database
  try {
    const result = await db.execute(sql`SELECT NOW() as now`);
    dbStatus = { ok: true, time: String(result[0]?.now) };
  } catch (e) {
    console.error(e);
  }

  // 2. Test Message Queue
  try {
    await publishTestMessage('test-init-queue', {
      event: 'PROJECT_INIT',
      message: 'TixTac infra is online!',
    });
    mqStatus = { ok: true, error: '' };
  } catch (e) {
    mqStatus = { ok: false, error: e instanceof Error ? e.message : 'MQ Error' };
  }

  return { dbStatus, mqStatus };
};
