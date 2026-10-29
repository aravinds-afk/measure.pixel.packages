import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, parseJson } from "@/server/http";
import { reviseQuote } from "@/server/services/quotes";
import { enqueue } from "@/server/sheets/sync";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await ctx.params;
  const { idempotencyKey } = await parseJson(req, z.object({ idempotencyKey: z.string().min(8).max(80) }));
  const db = getDb();
  const q = await reviseQuote(db, user, id, idempotencyKey);
  await enqueue(db, "quote", q.id);
  return NextResponse.json({ quoteId: q.id, version: q.version });
});
