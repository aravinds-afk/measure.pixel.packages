import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/server/db";
import { handle, HttpError } from "@/server/http";
import { defaultApi, processPending } from "@/server/sheets/sync";

/** Scheduled retry of queued/failed Sheets writes. Vercel Cron sends Authorization: Bearer $CRON_SECRET. */
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) throw new HttpError(401, "Unauthorized");
  const conn = defaultApi();
  if (!conn) return NextResponse.json({ skipped: "Google Sheets not configured" });
  const results = await processPending(getDb(), conn.api, 50);
  return NextResponse.json({ processed: Object.keys(results).length, results });
});
