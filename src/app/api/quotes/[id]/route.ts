import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteDocSchema, type QuoteDoc } from "@/lib/quote-schema";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, parseJson } from "@/server/http";
import { getSettings } from "@/server/settings";
import { docForUser, saveDraft, totalsForUser } from "@/server/services/quotes";
import { enqueue } from "@/server/sheets/sync";
import type { QuoteTotals } from "@/lib/pricing";

const schema = z.object({
  rev: z.number().int(),
  doc: quoteDocSchema,
  expectedTotals: z.object({ oneTimeTotal: z.number().int(), monthlyTotal: z.number().int(), annualTotal: z.number().int(), initialPaymentDue: z.number().int() }).optional(),
});

export const PUT = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await parseJson(req, schema);
  const db = getDb();
  const row = await saveDraft(db, user, await getSettings(db), id, body);
  await enqueue(db, "quote", id);
  return NextResponse.json({ rev: row.rev, doc: docForUser(row.doc as QuoteDoc, user), totals: totalsForUser(row.totals as QuoteTotals, user) });
});
