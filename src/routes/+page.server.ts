import { sql } from '$lib/server/db';
import { publishTestMessage } from '$lib/server/mq/connection';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  let dbStatus = { ok: false, time: '' };
  let mqStatus = { ok: false, error: '' };

  // 1. Test Database
  try {
    const result = await sql`SELECT NOW() as now`;
    dbStatus = { ok: true, time: result[0].now as string };
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
