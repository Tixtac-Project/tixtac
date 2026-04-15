// src/lib/utils/datetime.ts
import { CalendarDateTime, getLocalTimeZone, toZoned } from '@internationalized/date';

/** Convert 12-hour AM/PM to 24-hour number */
export function get24Hour(hour: string | number, period: 'AM' | 'PM'): number {
  let h = Number(hour);
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return h;
}

/** Build an ISO-8601 datetime string with timezone offset from date parts + 12h time */
export function buildISODateTime(
  date: { year: number; month: number; day: number } | undefined,
  hour: string,
  minute: string,
  period: 'AM' | 'PM',
): string {
  if (!date) return '';
  const tz = getLocalTimeZone();
  const dt = new CalendarDateTime(
    date.year,
    date.month,
    date.day,
    get24Hour(hour, period),
    Number(minute),
    0,
  );
  const zdt = toZoned(dt, tz);
  return zdt.toString().replace(/\[.+\]$/, '');
}

/** Build a locale-formatted preview string like "7:00 CH ngày Thứ Hai, 14 tháng 4, 2025 (GMT+07:00)" */
export function getDateTimePreview(
  date: { year: number; month: number; day: number } | undefined,
  hour: string,
  minute: string,
  period: 'AM' | 'PM',
  tzName: string,
): string {
  if (!date) return '';
  const tz = getLocalTimeZone();
  const dt = new CalendarDateTime(
    date.year,
    date.month,
    date.day,
    get24Hour(hour, period),
    Number(minute),
    0,
  );
  const zdt = toZoned(dt, tz);
  const jsDate = zdt.toDate();
  const dateStr = jsDate.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = jsDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${timeStr} ngày ${dateStr} (${tzName})`;
}

/** Resolve the user's timezone long-offset name, e.g. "GMT+07:00" */
export function getTimezoneName(): string {
  return (
    Intl.DateTimeFormat('vi-VN', { timeZoneName: 'longOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? getLocalTimeZone()
  );
}

/** Standard hour options for 12h Select (1–12) */
export const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return { value: String(h), label: String(h).padStart(2, '0') };
});

/** Standard minute options (00, 05, 10, ..., 55) */
export const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const m = i * 5;
  return { value: String(m), label: String(m).padStart(2, '0') };
});

/** Convert 24-hour number to 12-hour AM/PM format */
export function to12Hour(h24: number): { hour: string; period: 'AM' | 'PM' } {
  if (h24 === 0) return { hour: '12', period: 'AM' };
  if (h24 < 12) return { hour: String(h24), period: 'AM' };
  if (h24 === 12) return { hour: '12', period: 'PM' };
  return { hour: String(h24 - 12), period: 'PM' };
}

/** Format a date string or Date object to "Thứ Hai, 14 tháng 4, 2025" in Vietnamese locale */
export function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Format a date string or Date object to "07:00" in Vietnamese locale */
export const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
