import { NextResponse } from "next/server";
import { z } from "zod";
import { QUOTE_STATUSES } from "@/lib/quote-schema";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, parseJson } from "@/server/http";
import { changeStatus } from "@/server/services/quotes";
import { syncNow } from "@/server/sheets/sync";

const schema = z.object({ from: z.enum(QUOTE_STATUSES), to: z.enum(["presented", "sent", "accepted", "rejected"]) });

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await parseJson(req, schema);
  const db = getDb();
  const q = await changeStatus(db, user, id, body);
  const sync = await syncNow(db, "quote", id);
  return NextResponse.json({ status: q.status, issueDate: q.issueDate, validUntil: q.validUntil, rev: q.rev, sync });
});
