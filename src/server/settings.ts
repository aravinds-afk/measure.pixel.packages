import "server-only";
import { DEFAULT_SETTINGS } from "@/data/defaults";
import { rupeesToPaise } from "@/lib/money";
import type { DB } from "./db";
import { getDb } from "./db";
import { settings } from "./db/schema";

/** Settings as stored: same shape as DEFAULT_SETTINGS, revenue amounts in paise. */
export type Settings = typeof DEFAULT_SETTINGS;

const defaultsInPaise = (): Settings => ({
  ...DEFAULT_SETTINGS,
  revenue: {
    ...DEFAULT_SETTINGS.revenue,
    targetMonthly: rupeesToPaise(DEFAULT_SETTINGS.revenue.targetMonthly),
    startingSigned: rupeesToPaise(DEFAULT_SETTINGS.revenue.startingSigned),
    profitFloorMonthly: rupeesToPaise(DEFAULT_SETTINGS.revenue.profitFloorMonthly),
  },
  plan: { ...DEFAULT_SETTINGS.plan, avgRetainer: rupeesToPaise(DEFAULT_SETTINGS.plan.avgRetainer) },
});

export async function getSettings(db: DB = getDb()): Promise<Settings> {
  const rows = await db.select().from(settings);
  const out = defaultsInPaise() as Record<string, unknown>;
  for (const r of rows) {
    if (r.key in out && r.value && typeof r.value === "object") out[r.key] = { ...(out[r.key] as object), ...(r.value as object) };
  }
  return out as Settings;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K], userId: string, db: DB = getDb()) {
  await db
    .insert(settings)
    .values({ key, value, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: userId, updatedAt: new Date().toISOString() } });
}
