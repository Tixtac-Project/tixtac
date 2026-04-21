import type { db } from '$lib/server/db';

/** Drizzle transaction context — usable across all services. */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
