import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { planProgress } from "@/server/db/schema";
import { assertSameOrigin, handle, parseJson } from "@/server/http";

const schema = z.object({ id: z.string().regex(/^\d{4}-\d{2}-\d{2}:[A-Za-z0-9-]{1,80}$/), done: z.boolean() });

/** Tick or untick a morning-page task. Idempotent. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id, done } = await parseJson(req, schema);
  const db = getDb();
  const [date, taskKey] = [id.slice(0, 10), id.slice(11)];
  if (done) await db.insert(planProgress).values({ id, date, taskKey, doneBy: user.id, doneAt: new Date().toISOString() }).onConflictDoNothing();
  else await db.delete(planProgress).where(eq(planProgress.id, id));
  return NextResponse.json({ ok: true });
});
