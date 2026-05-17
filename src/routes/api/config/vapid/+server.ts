import { json } from '@sveltejs/kit';
import { apiHandler } from '$lib/server/handler';
import { config } from '$lib/server/config';

export const GET = apiHandler(async () => {
  return json({ data: { publicKey: config.vapidPublicKey } }, { status: 200 });
});
