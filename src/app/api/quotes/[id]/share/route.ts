import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, parseJson } from "@/server/http";
import { setShareLink } from "@/server/services/quotes";
import { syncNow } from "@/server/sheets/sync";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  await requireUser();
  const { id } = await ctx.params;
  const { enabled } = await parseJson(req, z.object({ enabled: z.boolean() }));
  const db = getDb();
  const q = await setShareLink(db, id, enabled);
  const sync = await syncNow(db, "quote", id);
  return NextResponse.json({ token: q.publicToken, sync });
});
