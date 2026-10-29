import "server-only";
import { eq } from "drizzle-orm";
import type { QuoteDoc } from "@/lib/quote-schema";
import { computeTotals } from "@/lib/pricing";
import { revenueSummary, type RevenueQuote } from "@/lib/revenue";
import type { DB } from "../db";
import * as s from "../db/schema";
import type { Settings } from "../settings";
import { effectiveStatus } from "./quotes";

/** Revenue figures shared by the dashboard and the morning page. */
export async function loadRevenue(db: DB, settings: Settings) {
  const [quotes, industries, payments] = await Promise.all([
    db.select({ q: s.quotes, industryId: s.clients.industryId }).from(s.quotes).innerJoin(s.clients, eq(s.clients.id, s.quotes.clientId)),
    db.select().from(s.industries),
    db.select().from(s.payments),
  ]);
  const indName = new Map(industries.map((i) => [i.id, i.name]));
  const rq: RevenueQuote[] = quotes.map(({ q, industryId }) => {
    const doc = q.doc as QuoteDoc;
    const t = computeTotals(doc);
    const ratio = t.monthlySubtotal > 0 ? t.monthlyNet / t.monthlySubtotal : 1;
    return {
      id: q.id, rootId: q.rootId, version: q.version, clientId: q.clientId, status: effectiveStatus(q),
      monthlyNet: q.monthlyNet, oneTimeNet: q.oneTimeNet, annualNet: q.annualNet,
      industryName: industryId ? indName.get(industryId) ?? "" : "",
      offerMonthly: doc.items.map((it, i) => ({ it, l: t.lines[i] })).filter(({ it }) => it.kind === "offer" && !it.optional).map(({ it, l }) => ({ offerName: it.name, monthly: Math.round(l.monthly * ratio) })),
    };
  });
  return revenueSummary({
    targetMonthly: settings.revenue.targetMonthly,
    startingSigned: settings.revenue.startingSigned,
    startingSignedClients: settings.revenue.startingSignedClients,
    quotes: rq,
    cashCollected: payments.reduce((n, p) => n + p.amount, 0),
  });
}
