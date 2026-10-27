import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle } from "@/server/http";
import { getQuote } from "@/server/services/quotes";
import { syncNow } from "@/server/sheets/sync";

/** Explicit "Save to Google Sheets": quote, items, client, audit and recommendations, each confirmed. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  await requireUser();
  const { id } = await ctx.params;
  const db = getDb();
  const q = await getQuote(db, id);
  const results = { quote: await syncNow(db, "quote", id) } as Record<string, Awaited<ReturnType<typeof syncNow>>>;
  if (q.auditId) {
    results.audit = await syncNow(db, "audit", q.auditId);
    results.recommendations = await syncNow(db, "recommendations", q.auditId);
  }
  return NextResponse.json({ results });
});
