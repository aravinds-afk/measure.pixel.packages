import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, parseJson } from "@/server/http";
import { auditPatchSchema, updateAudit } from "@/server/services/audits";
import { enqueue, syncNow } from "@/server/sheets/sync";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  await requireUser();
  const { id } = await ctx.params;
  const patch = await parseJson(req, auditPatchSchema);
  const db = getDb();
  const audit = await updateAudit(db, id, patch);
  // Autosaves are queued; completing the audit (or an explicit sync) waits for Google's confirmation.
  const wantsSync = patch.status === "completed" || new URL(req.url).searchParams.get("sync") === "1";
  const sync = wantsSync ? await syncNow(db, "audit", id) : { status: "queued" as const, jobId: await enqueue(db, "audit", id) };
  return NextResponse.json({ rev: audit.rev, status: audit.status, updatedAt: audit.updatedAt, sync });
});
