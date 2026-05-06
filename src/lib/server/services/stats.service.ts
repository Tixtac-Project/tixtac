// src/lib/server/services/stats.service.ts
import {
  cacheKey,
  l1Cache,
  L2_TTL,
  normalizeDateStart,
  REFRESH_COOLDOWN_S,
  refreshRateLimitKey,
} from '$lib/server/cache';
import { db } from '$lib/server/db';
import { events, eventShows, orderItems, orders, seats, users } from '$lib/server/db/schema';
import { redis } from '$lib/server/redis';
import type { DemographicsStats, OverviewStats, SalesVelocityPoint } from '$lib/types/stats';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

// ══════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════

function generatePeriodRange(
  startDate: string,
  endDate: string,
  interval: 'hour' | 'day' | 'week',
): string[] {
  const periods: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (interval === 'hour') {
    const current = new Date(start);
    current.setUTCMinutes(0, 0, 0);
    while (current <= end) {
      periods.push(current.toISOString().slice(0, 13) + ':00');
      current.setUTCHours(current.getUTCHours() + 1);
    }
  } else if (interval === 'day') {
    const current = new Date(start);
    current.setUTCHours(0, 0, 0, 0);
    while (current <= end) {
      periods.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
  } else {
    const current = new Date(start);
    const day = current.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    current.setUTCDate(current.getUTCDate() - diff);
    current.setUTCHours(0, 0, 0, 0);
    while (current <= end) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(current.getUTCDate()).padStart(2, '0');
      periods.push(`${year}-${month}-${dayOfMonth}`);
      current.setUTCDate(current.getUTCDate() + 7);
    }
  }
  return periods;
}

function fillVelocityData(
  rawData: Map<string, { revenue: number; tickets: number }>,
  fullPeriods: string[],
  interval: 'hour' | 'day' | 'week',
): SalesVelocityPoint[] {
  return fullPeriods.map((p) => {
    const displayPeriod =
      interval === 'hour' ? p.slice(0, 13).replace('T', ' ') + ':00' : p.slice(0, 10);
    const data = rawData.get(p);
    return {
      period: displayPeriod,
      revenue: data ? Number(data.revenue) : 0,
      tickets: data ? data.tickets : 0,
    };
  });
}

function ageGroup(dobStr: string): string {
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  if (age < 13) return '13-17';
  if (age <= 17) return '13-17';
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  return '45+';
}

/**
 * Resolve startDate: use the provided value, or fall back to the event's
 * createdAt timestamp from the database. End date defaults to now.
 */
async function resolveDateRange(
  eventId: number,
  startDate: string | null,
  endDate: string | null,
): Promise<{ startDate: string; endDate: string }> {
  const resolvedEnd = endDate ?? new Date().toISOString();

  if (startDate) {
    return { startDate, endDate: resolvedEnd };
  }

  const [event] = await db
    .select({ createdAt: events.createdAt })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const resolvedStart = event?.createdAt
    ? new Date(event.createdAt).toISOString()
    : new Date(0).toISOString();

  return { startDate: resolvedStart, endDate: resolvedEnd };
}

// ══════════════════════════════════════════════════
// PREPARED STATEMENTS (compiled once at startup)
// ══════════════════════════════════════════════════

const overviewStmt = db
  .select({
    totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'paid' THEN ${orders.totalAmount} ELSE 0 END), '0')`,
    paidCount: sql<number>`COUNT(CASE WHEN ${orders.status} = 'paid' THEN 1 END)::int`,
    cancelledCount: sql<number>`COUNT(CASE WHEN ${orders.status} = 'cancelled' THEN 1 END)::int`,
  })
  .from(orders)
  .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
  .innerJoin(seats, eq(seats.id, orderItems.seatId))
  .innerJoin(eventShows, eq(eventShows.id, seats.showId))
  .where(
    and(
      eq(eventShows.eventId, sql.placeholder('eventId')),
      gte(orders.createdAt, sql.placeholder('startDate')),
      lte(orders.createdAt, sql.placeholder('endDate')),
    ),
  )
  .prepare('stats_overview');

function buildVelocityStmt(interval: 'hour' | 'day' | 'week') {
  const trunc = sql`date_trunc(${sql.raw(`'${interval}'`)}, ${orders.createdAt})`;
  return db
    .select({
      period: sql<string>`${trunc}::text`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'paid' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
      tickets: sql<number>`COUNT(CASE WHEN ${orders.status} = 'paid' THEN 1 END)::int`,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(seats, eq(seats.id, orderItems.seatId))
    .innerJoin(eventShows, eq(eventShows.id, seats.showId))
    .where(
      and(
        eq(eventShows.eventId, sql.placeholder('eventId')),
        gte(orders.createdAt, sql.placeholder('startDate')),
        lte(orders.createdAt, sql.placeholder('endDate')),
      ),
    )
    .groupBy(trunc)
    .orderBy(trunc)
    .prepare(`stats_velocity_${interval}`);
}

const velocityHourStmt = buildVelocityStmt('hour');
const velocityDayStmt = buildVelocityStmt('day');
const velocityWeekStmt = buildVelocityStmt('week');

function getVelocityStmt(interval: 'hour' | 'day' | 'week') {
  if (interval === 'hour') return velocityHourStmt;
  if (interval === 'week') return velocityWeekStmt;
  return velocityDayStmt;
}

const demographicsRowStmt = db
  .select({
    gender: users.gender,
    dateOfBirth: users.dateOfBirth,
    userId: users.id,
  })
  .from(users)
  .innerJoin(orders, eq(orders.userId, users.id))
  .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
  .innerJoin(seats, eq(seats.id, orderItems.seatId))
  .innerJoin(eventShows, eq(eventShows.id, seats.showId))
  .where(
    and(
      eq(orders.status, 'paid'),
      eq(eventShows.eventId, sql.placeholder('eventId')),
      gte(orders.createdAt, sql.placeholder('startDate')),
      lte(orders.createdAt, sql.placeholder('endDate')),
    ),
  )
  .prepare('stats_demographics');

// ══════════════════════════════════════════════════
// TWO-TIER CACHE HELPERS
// ══════════════════════════════════════════════════

async function getFromL2<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get<string>(key);
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('[L2 Redis] get error:', err);
    return null;
  }
}

async function setToL2(key: string, data: unknown): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), { ex: L2_TTL });
  } catch (err) {
    console.error('[L2 Redis] set error:', err);
  }
}

async function withTwoTierCache<T>(cacheKey: string, dbFetcher: () => Promise<T>): Promise<T> {
  const l1Hit = l1Cache.get(cacheKey);
  if (l1Hit !== undefined) {
    return l1Hit as T;
  }

  const l2Hit = await getFromL2<T>(cacheKey);
  if (l2Hit !== null) {
    l1Cache.set(cacheKey, l2Hit);
    return l2Hit;
  }

  const data = await dbFetcher();
  await setToL2(cacheKey, data);
  l1Cache.set(cacheKey, data);
  return data;
}

// ══════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════

export const statsService = {
  async getOverview(
    eventId: number,
    startDate: string | null,
    endDate: string | null,
    forceRefresh: boolean,
    adminId: number,
  ): Promise<OverviewStats> {
    const { startDate: resolvedStart, endDate: resolvedEnd } = await resolveDateRange(
      eventId,
      startDate,
      endDate,
    );
    const normalizedStart = normalizeDateStart(resolvedStart);
    const normalizedEnd = normalizeDateStart(resolvedEnd);
    const key = cacheKey('overview', eventId, normalizedStart, normalizedEnd);

    if (forceRefresh) {
      const rlKey = refreshRateLimitKey(adminId);
      try {
        const exists = await redis.get(rlKey);
        if (exists) {
          return withTwoTierCache(key, () =>
            fetchOverviewFromDB(eventId, resolvedStart, resolvedEnd),
          );
        }
        await redis.set(rlKey, '1', { ex: REFRESH_COOLDOWN_S });
      } catch {
        // Redis down — skip rate limiting
      }

      const data = await fetchOverviewFromDB(eventId, resolvedStart, resolvedEnd);
      await setToL2(key, data);
      l1Cache.set(key, data);
      return data;
    }

    return withTwoTierCache(key, () => fetchOverviewFromDB(eventId, resolvedStart, resolvedEnd));
  },

  async getSalesVelocity(
    eventId: number,
    interval: 'hour' | 'day' | 'week',
    startDate: string | null,
    endDate: string | null,
    forceRefresh: boolean,
    adminId: number,
  ): Promise<SalesVelocityPoint[]> {
    const { startDate: resolvedStart, endDate: resolvedEnd } = await resolveDateRange(
      eventId,
      startDate,
      endDate,
    );
    const normalizedStart = normalizeDateStart(resolvedStart);
    const normalizedEnd = normalizeDateStart(resolvedEnd);
    const key = cacheKey('velocity', eventId, interval, normalizedStart, normalizedEnd);

    if (forceRefresh) {
      const rlKey = refreshRateLimitKey(adminId);
      try {
        const exists = await redis.get(rlKey);
        if (exists) {
          return withTwoTierCache(key, () =>
            fetchVelocityFromDB(eventId, interval, resolvedStart, resolvedEnd),
          );
        }
        await redis.set(rlKey, '1', { ex: REFRESH_COOLDOWN_S });
      } catch {
        // Redis down — proceed
      }

      const data = await fetchVelocityFromDB(eventId, interval, resolvedStart, resolvedEnd);
      await setToL2(key, data);
      l1Cache.set(key, data);
      return data;
    }

    return withTwoTierCache(key, () =>
      fetchVelocityFromDB(eventId, interval, resolvedStart, resolvedEnd),
    );
  },

  async getDemographics(
    eventId: number,
    startDate: string | null,
    endDate: string | null,
    forceRefresh: boolean,
    adminId: number,
  ): Promise<DemographicsStats> {
    const { startDate: resolvedStart, endDate: resolvedEnd } = await resolveDateRange(
      eventId,
      startDate,
      endDate,
    );
    const normalizedStart = normalizeDateStart(resolvedStart);
    const normalizedEnd = normalizeDateStart(resolvedEnd);
    const key = cacheKey('demographics', eventId, normalizedStart, normalizedEnd);

    if (forceRefresh) {
      const rlKey = refreshRateLimitKey(adminId);
      try {
        const exists = await redis.get(rlKey);
        if (exists) {
          return withTwoTierCache(key, () =>
            fetchDemographicsFromDB(eventId, resolvedStart, resolvedEnd),
          );
        }
        await redis.set(rlKey, '1', { ex: REFRESH_COOLDOWN_S });
      } catch {
        // Redis down — proceed
      }

      const data = await fetchDemographicsFromDB(eventId, resolvedStart, resolvedEnd);
      await setToL2(key, data);
      l1Cache.set(key, data);
      return data;
    }

    return withTwoTierCache(key, () =>
      fetchDemographicsFromDB(eventId, resolvedStart, resolvedEnd),
    );
  },
};

// ══════════════════════════════════════════════════
// DB FETCHERS (Private, non-cached)
// ══════════════════════════════════════════════════

async function fetchOverviewFromDB(
  eventId: number,
  startDate: string,
  endDate: string,
): Promise<OverviewStats> {
  const [row] = await overviewStmt.execute({
    eventId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  const paidCount = row?.paidCount ?? 0;
  const cancelledCount = row?.cancelledCount ?? 0;
  const total = paidCount + cancelledCount;
  const dropOffRate = total > 0 ? cancelledCount / total : 0;

  return {
    totalRevenue: row ? Number(row.totalRevenue) : 0,
    totalTicketsSold: paidCount,
    dropOffRate: Math.round(dropOffRate * 10000) / 10000,
    paidOrders: paidCount,
    cancelledOrders: cancelledCount,
  };
}

async function fetchVelocityFromDB(
  eventId: number,
  interval: 'hour' | 'day' | 'week',
  startDate: string,
  endDate: string,
): Promise<SalesVelocityPoint[]> {
  const rows = await getVelocityStmt(interval).execute({
    eventId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  const rawMap = new Map<string, { revenue: number; tickets: number }>();
  for (const row of rows) {
    rawMap.set(row.period, { revenue: Number(row.revenue), tickets: row.tickets });
  }

  const allPeriods = generatePeriodRange(startDate, endDate, interval);
  return fillVelocityData(rawMap, allPeriods, interval);
}

async function fetchDemographicsFromDB(
  eventId: number,
  startDate: string,
  endDate: string,
): Promise<DemographicsStats> {
  const rows = await demographicsRowStmt.execute({
    eventId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  // Deduplicate in TypeScript (selectDistinct incompatible with .prepare())
  const seenUserIds = new Set<number>();
  const uniqueRows: typeof rows = [];
  for (const row of rows) {
    if (!seenUserIds.has(row.userId)) {
      seenUserIds.add(row.userId);
      uniqueRows.push(row);
    }
  }

  const gender = { male: 0, female: 0, other: 0 };
  const ageGroups = { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };

  for (const row of uniqueRows) {
    gender[row.gender as keyof typeof gender]++;
    const group = ageGroup(row.dateOfBirth) as keyof typeof ageGroups;
    ageGroups[group]++;
  }

  return {
    gender,
    ageGroups,
    total: uniqueRows.length,
  };
}
