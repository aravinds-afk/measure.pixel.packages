import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";
import { writeBrief } from "@/server/services/brief";
import { briefContext, buildToday, localToday } from "@/server/services/today";

export const maxDuration = 60;

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await rateLimit(`brief:${user.id}`, 6, 3600);
  const db = getDb();
  const settings = await getSettings(db);
  const today = await buildToday(db, settings, localToday(settings.plan.timeZone));
  const text = await writeBrief(db, today.date, briefContext(today));
  return NextResponse.json({ text });
});
