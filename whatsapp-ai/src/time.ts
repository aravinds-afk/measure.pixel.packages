import type { Weekday } from "./tenant.js";

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: Weekday;
}

export function localParts(ms: number, tz: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday").toLowerCase().slice(0, 3) as Weekday,
  };
}

// Converts a wall-clock time in `tz` to a UTC epoch (ms). Two passes handle DST edges.
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): number {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = localParts(guess, tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += target - asUtc;
  }
  return guess;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

/** Local wall-clock `hh:mm` on the day `daysFromNow` days after `from` (in tz). */
export function atLocalTime(from: number, daysFromNow: number, hhmm: string, tz: string): number {
  const p = localParts(from + daysFromNow * DAY, tz);
  const [h, m] = hhmm.split(":").map(Number);
  return zonedTimeToUtc(p.year, p.month, p.day, h!, m!, tz);
}

/** Next occurrence strictly after `from` of `hhmm` on one of `days`, in tz. */
export function nextOccurrence(from: number, days: Weekday[], hhmm: string, tz: string): number {
  for (let i = 0; i <= 7; i++) {
    const candidate = atLocalTime(from, i, hhmm, tz);
    if (candidate > from && days.includes(localParts(candidate, tz).weekday)) return candidate;
  }
  throw new Error(`no occurrence for ${days.join(",")} ${hhmm}`);
}

export function inQuietHours(ms: number, quiet: { start: string; end: string }, tz: string): boolean {
  const p = localParts(ms, tz);
  const now = p.hour * 60 + p.minute;
  const s = toMinutes(quiet.start);
  const e = toMinutes(quiet.end);
  return s <= e ? now >= s && now < e : now >= s || now < e;
}

/** Pushes `ms` to the end of quiet hours if it falls inside them. */
export function outsideQuietHours(ms: number, quiet: { start: string; end: string }, tz: string): number {
  if (!inQuietHours(ms, quiet, tz)) return ms;
  const p = localParts(ms, tz);
  const endToday = atLocalTime(ms, 0, quiet.end, tz);
  return endToday > ms && p.hour * 60 + p.minute < toMinutes(quiet.end) ? endToday : atLocalTime(ms, 1, quiet.end, tz);
}

export function formatLocal(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(new Date(ms));
}

export { WEEKDAYS };
