import "server-only";
import { sql } from "drizzle-orm";
import type { DB } from "./db";
import { getDb } from "./db";
import { rateLimits } from "./db/schema";
import { HttpError } from "./http";

/**
 * Fixed-window limiter stored in the database, so it holds across serverless
 * instances. Single atomic upsert per call.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number, db: DB = getDb()) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} = ${windowStart} then ${rateLimits.count} + 1 else 1 end`,
        windowStart,
      },
    })
    .returning();
  if (row.count > limit) {
    throw new HttpError(429, `Too many requests. Try again in ${windowStart + windowSeconds - now}s.`);
  }
}
