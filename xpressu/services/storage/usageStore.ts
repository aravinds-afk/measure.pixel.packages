/**
 * Local daily-usage counter for the free tier. This drives the UI; the
 * backend enforces the same limit server-side (consume_generation RPC), so
 * tampering with local storage doesn't bypass it in production.
 */
import { LIMITS } from '@/constants/config';
import { dayKey } from '@/lib/format';

import { getJSON, setJSON } from './secureStorage';

const USAGE_KEY = 'usage.v1';

interface UsageRecord {
  day: string;
  count: number;
}

export interface UsageState {
  used: number;
  limit: number;
  remaining: number;
}

function toState(count: number): UsageState {
  return { used: count, limit: LIMITS.freeDailyGenerations, remaining: Math.max(0, LIMITS.freeDailyGenerations - count) };
}

async function read(): Promise<UsageRecord> {
  const today = dayKey();
  const stored = await getJSON<UsageRecord>(USAGE_KEY);
  return stored && stored.day === today ? stored : { day: today, count: 0 };
}

export async function getUsage(): Promise<UsageState> {
  return toState((await read()).count);
}

export async function recordGeneration(): Promise<UsageState> {
  const current = await read();
  const next = { day: current.day, count: current.count + 1 };
  await setJSON(USAGE_KEY, next);
  return toState(next.count);
}

/** Server said we're out — sync the local counter so the UI matches. */
export async function markExhausted(): Promise<UsageState> {
  const today = dayKey();
  await setJSON(USAGE_KEY, { day: today, count: LIMITS.freeDailyGenerations });
  return toState(LIMITS.freeDailyGenerations);
}

export async function resetUsage(): Promise<void> {
  await setJSON(USAGE_KEY, { day: dayKey(), count: 0 });
}
