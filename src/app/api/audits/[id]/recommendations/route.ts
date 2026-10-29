import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, parseJson } from "@/server/http";
import { computeRecommendations, decisionsSchema, saveRecommendations } from "@/server/services/audits";
import { syncNow } from "@/server/sheets/sync";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  return NextResponse.json(await computeRecommendations(getDb(), id));
});

export const PUT = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  await requireUser();
  const { id } = await ctx.params;
  const { decisions } = await parseJson(req, decisionsSchema);
  const db = getDb();
  const rows = await saveRecommendations(db, id, decisions);
  const sync = await syncNow(db, "recommendations", id);
  return NextResponse.json({ saved: rows.length, sync });
});
