// src/lib/server/services/stats.service.ts
import {
  cacheKey,
  l1Cache,
  L2_TTL,
  REFRESH_COOLDOWN_S,
  refreshRateLimitKey,
} from '$lib/server/cache';
import { db } from '$lib/server/db';
import { events, orderItems, orders, users } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
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
      periods.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 7);
    }
  }
  return periods;
}

function fillVelocityData(
  rawData: Map<string, { revenue: number; tickets: number }>,
  fullPeriods: string[],
): SalesVelocityPoint[] {
  return fullPeriods.map((p) => {
    const data = rawData.get(p);
    return {
      period: p,
      revenue: data ? Number(data.revenue) : 0,
      tickets: data ? data.tickets : 0,
    };
  });
}

function ageGroup(dobStr: string, now: Date): string {
  const dob = new Date(dobStr);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  if (age < 6) return '< 6';
  if (age <= 11) return '6-11';
  if (age <= 15) return '12-15';
  if (age <= 18) return '16-18';
  if (age <= 22) return '19-22';
  if (age <= 29) return '23-29';
  if (age <= 39) return '30-39';
  if (age <= 49) return '40-49';
  if (age <= 60) return '50-60';
  return '> 60';
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

async function resolveDateRange(
  eventId: number,
  startDate: string | null,
  endDate: string | null,
): Promise<{ startDate: string; endDate: string }> {
  // Explicit endDate → use as-is. Default → end of today (23:59:59.999).
  let resolvedEnd: string;
  if (endDate) {
    const d = new Date(endDate);
    if (!isValidDate(d)) throwError(Errors.VALIDATION({ endDate: 'Định dạng ngày không hợp lệ' }));
    resolvedEnd = d.toISOString();
  } else {
    const eod = new Date();
    eod.setUTCHours(23, 59, 59, 999);
    resolvedEnd = eod.toISOString();
  }

  // Explicit startDate → use as-is. Default → start of the event's creation day.
  if (startDate) {
    const d = new Date(startDate);
    if (!isValidDate(d))
      throwError(Errors.VALIDATION({ startDate: 'Định dạng ngày không hợp lệ' }));
    return { startDate: d.toISOString(), endDate: resolvedEnd };
  }

  const [event] = await db
    .select({ createdAt: events.createdAt })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event?.createdAt) {
    throwError(Errors.NOT_FOUND, `Không tìm thấy sự kiện với id ${eventId}`);
  }

  const sod = new Date(event.createdAt);
  sod.setUTCHours(0, 0, 0, 0);

  return { startDate: sod.toISOString(), endDate: resolvedEnd };
}

/** Build a cache-key-safe date segment: null → sentinel, otherwise exact ISO instant */
function cacheDateSegment(dateStr: string | null): string {
  if (dateStr === null) return 'event_start';
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? dateStr : parsed.toISOString();
}

// ══════════════════════════════════════════════════
// PREPARED STATEMENTS (compiled once at startup)
// ══════════════════════════════════════════════════

const overviewStmt = db
  .select({
    totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'paid' THEN ${orderItems.priceSnapshot} ELSE 0 END), '0')`,
    totalTicketsSold: sql<number>`COUNT(CASE WHEN ${orders.status} = 'paid' THEN ${orderItems.id} END)::int`,
    paidOrders: sql<number>`COUNT(DISTINCT CASE WHEN ${orders.status} = 'paid' THEN ${orders.id} END)::int`,
    cancelledOrders: sql<number>`COUNT(DISTINCT CASE WHEN ${orders.status} = 'cancelled' THEN ${orders.id} END)::int`,
  })
  .from(orders)
  .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
  .where(
    and(
      eq(orderItems.eventId, sql.placeholder('eventId')),
      gte(orders.createdAt, sql.placeholder('startDate')),
      lte(orders.createdAt, sql.placeholder('endDate')),
    ),
  )
  .prepare('stats_overview');
function buildVelocityStmt(interval: 'hour' | 'day' | 'week') {
  const format = interval === 'hour' ? `'YYYY-MM-DD"T"HH24:00'` : `'YYYY-MM-DD'`;
  const periodExpr = sql`to_char(date_trunc(${sql.raw(`'${interval}'`)}, ${orders.createdAt}), ${sql.raw(format)})`;
  return db
    .select({
      period: sql<string>`${periodExpr}`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'paid' THEN ${orderItems.priceSnapshot} ELSE 0 END), 0)`,
      tickets: sql<number>`COUNT(CASE WHEN ${orders.status} = 'paid' THEN ${orderItems.id} END)::int`,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.eventId, sql.placeholder('eventId')),
        gte(orders.createdAt, sql.placeholder('startDate')),
        lte(orders.createdAt, sql.placeholder('endDate')),
      ),
    )
    .groupBy(periodExpr)
    .orderBy(periodExpr)
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

/**
 * Demographics now joins only 3 tables instead of 5:
 *   users → orders → order_items
 * No more seats or event_shows joins needed.
 */
const demographicsRowStmt = db
  .select({
    gender: sql<'male' | 'female' | 'other'>`MAX(${users.gender})`,
    dateOfBirth: sql<string>`MAX(${users.dateOfBirth})`,
  })
  .from(users)
  .innerJoin(orders, eq(orders.userId, users.id))
  .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
  .where(
    and(
      eq(orders.status, 'paid'),
      eq(orderItems.eventId, sql.placeholder('eventId')),
      gte(orders.createdAt, sql.placeholder('startDate')),
      lte(orders.createdAt, sql.placeholder('endDate')),
    ),
  )
  .groupBy(users.id)
  .prepare('stats_demographics');

// ══════════════════════════════════════════════════
// TWO-TIER CACHE HELPERS
// ══════════════════════════════════════════════════

async function getFromL2<T>(key: string): Promise<T | null> {
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch (err) {
    console.error('[L2 Redis] get error:', err);
    return null;
  }
}

async function setToL2(key: string, data: unknown): Promise<void> {
  try {
    await redis.set(key, data, { ex: L2_TTL });
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

async function withForceRefresh<T>(
  key: string,
  adminId: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const rlKey = refreshRateLimitKey(adminId);
  try {
    // Single round-trip: atomically check-and-set rate limit via SET NX
    const acquired = await redis.set(rlKey, '1', { nx: true, ex: REFRESH_COOLDOWN_S });
    if (!acquired) {
      return withTwoTierCache(key, fetcher);
    }
  } catch {
    // Redis down — skip rate limiting, proceed with refresh
  }

  const data = await fetcher();
  await setToL2(key, data);
  l1Cache.set(key, data);
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
    const key = cacheKey(
      'overview',
      eventId,
      cacheDateSegment(startDate),
      cacheDateSegment(endDate),
    );

    if (forceRefresh) {
      return withForceRefresh(key, adminId, () => fetchOverview(eventId, startDate, endDate));
    }
    return withTwoTierCache(key, () => fetchOverview(eventId, startDate, endDate));
  },

  async getSalesVelocity(
    eventId: number,
    interval: 'hour' | 'day' | 'week',
    startDate: string | null,
    endDate: string | null,
    forceRefresh: boolean,
    adminId: number,
  ): Promise<SalesVelocityPoint[]> {
    const key = cacheKey(
      'velocity',
      eventId,
      interval,
      cacheDateSegment(startDate),
      cacheDateSegment(endDate),
    );

    if (forceRefresh) {
      return withForceRefresh(key, adminId, () =>
        fetchVelocity(eventId, interval, startDate, endDate),
      );
    }
    return withTwoTierCache(key, () => fetchVelocity(eventId, interval, startDate, endDate));
  },

  async getDemographics(
    eventId: number,
    startDate: string | null,
    endDate: string | null,
    forceRefresh: boolean,
    adminId: number,
  ): Promise<DemographicsStats> {
    const key = cacheKey(
      'demographics',
      eventId,
      cacheDateSegment(startDate),
      cacheDateSegment(endDate),
    );

    if (forceRefresh) {
      return withForceRefresh(key, adminId, () => fetchDemographics(eventId, startDate, endDate));
    }
    return withTwoTierCache(key, () => fetchDemographics(eventId, startDate, endDate));
  },
};

// ══════════════════════════════════════════════════
// DB FETCHERS (Private, non-cached)
// ══════════════════════════════════════════════════

async function fetchOverview(
  eventId: number,
  startDate: string | null,
  endDate: string | null,
): Promise<OverviewStats> {
  const { startDate: s, endDate: e } = await resolveDateRange(eventId, startDate, endDate);

  const [row] = await overviewStmt.execute({
    eventId,
    startDate: new Date(s),
    endDate: new Date(e),
  });

  const paidCount = row?.paidOrders ?? 0;
  const cancelledCount = row?.cancelledOrders ?? 0;
  const total = paidCount + cancelledCount;
  const dropOffRate = total > 0 ? cancelledCount / total : 0;

  return {
    totalRevenue: row ? Number(row.totalRevenue) : 0,
    totalTicketsSold: row?.totalTicketsSold ?? 0,
    dropOffRate: Math.round(dropOffRate * 10000) / 10000,
    paidOrders: paidCount,
    cancelledOrders: cancelledCount,
  };
}

async function fetchVelocity(
  eventId: number,
  interval: 'hour' | 'day' | 'week',
  startDate: string | null,
  endDate: string | null,
): Promise<SalesVelocityPoint[]> {
  const { startDate: s, endDate: e } = await resolveDateRange(eventId, startDate, endDate);

  const rows = await getVelocityStmt(interval).execute({
    eventId,
    startDate: new Date(s),
    endDate: new Date(e),
  });

  const rawMap = new Map<string, { revenue: number; tickets: number }>();
  for (const row of rows) {
    rawMap.set(row.period, { revenue: Number(row.revenue), tickets: row.tickets });
  }

  const allPeriods = generatePeriodRange(s, e, interval);
  return fillVelocityData(rawMap, allPeriods);
}

async function fetchDemographics(
  eventId: number,
  startDate: string | null,
  endDate: string | null,
): Promise<DemographicsStats> {
  const { startDate: s, endDate: e } = await resolveDateRange(eventId, startDate, endDate);

  const rows = await demographicsRowStmt.execute({
    eventId,
    startDate: new Date(s),
    endDate: new Date(e),
  });

  const gender = { male: 0, female: 0, other: 0 };
  const ageGroups = {
    '< 6': 0,
    '6-11': 0,
    '12-15': 0,
    '16-18': 0,
    '19-22': 0,
    '23-29': 0,
    '30-39': 0,
    '40-49': 0,
    '50-60': 0,
    '> 60': 0,
  };
  const now = new Date();

  for (const row of rows) {
    gender[row.gender as keyof typeof gender]++;
    const group = ageGroup(row.dateOfBirth, now) as keyof typeof ageGroups;
    ageGroups[group]++;
  }

  return {
    gender,
    ageGroups,
    total: rows.length,
  };
}
