import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, parseJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";
import { autoAuditSchema, runAutoAudit } from "@/server/services/auto-audit";
import { enqueue } from "@/server/sheets/sync";

export const maxDuration = 60;

/** Links in → audit, prescription and draft quotation out. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const input = await parseJson(req, autoAuditSchema);
  await rateLimit(`auto-audit:${user.id}`, 10, 600);
  const db = getDb();
  const summary = await runAutoAudit(db, user, await getSettings(db), input);
  await enqueue(db, "audit", summary.auditId);
  await enqueue(db, "recommendations", summary.auditId);
  if (summary.quoteId) await enqueue(db, "quote", summary.quoteId);
  return NextResponse.json(summary);
});
