import type { QuoteStatus } from "./quote-schema";

/**
 * Revenue dashboard maths. Signed = accepted quotations only (latest
 * accepted version per quotation). Pipeline = presented/sent and not expired,
 * latest version per quotation. Drafts never count. Amounts are net of
 * discount and excluding tax (revenue, not cash and not profit).
 */

export type RevenueQuote = {
  id: string;
  rootId: string;
  version: number;
  clientId: string;
  status: QuoteStatus; // effective status (expired already applied)
  monthlyNet: number;
  oneTimeNet: number;
  annualNet: number;
  industryName: string;
  offerMonthly: { offerName: string; monthly: number }[];
};

export type RevenueInputs = {
  targetMonthly: number;
  startingSigned: number;
  startingSignedClients: number;
  quotes: RevenueQuote[];
  cashCollected: number;
};

export function revenueSummary(input: RevenueInputs) {
  const latestByRoot = new Map<string, RevenueQuote>();
  for (const q of input.quotes) {
    const cur = latestByRoot.get(q.rootId);
    if (!cur || q.version > cur.version) latestByRoot.set(q.rootId, q);
  }
  // Signed: an accepted version counts even if a later revision was opened.
  const acceptedByRoot = new Map<string, RevenueQuote>();
  for (const q of input.quotes) {
    if (q.status !== "accepted") continue;
    const cur = acceptedByRoot.get(q.rootId);
    if (!cur || q.version > cur.version) acceptedByRoot.set(q.rootId, q);
  }
  const signed = [...acceptedByRoot.values()];
  const open = [...latestByRoot.values()].filter((q) => (q.status === "presented" || q.status === "sent") && !acceptedByRoot.has(q.rootId));
  const lost = [...latestByRoot.values()].filter((q) => q.status === "rejected" && !acceptedByRoot.has(q.rootId));
  const expired = [...latestByRoot.values()].filter((q) => q.status === "expired" && !acceptedByRoot.has(q.rootId));

  const sum = (arr: RevenueQuote[], f: (q: RevenueQuote) => number) => arr.reduce((n, q) => n + f(q), 0);
  const signedMonthlyFromQuotes = sum(signed, (q) => q.monthlyNet);
  const signedMonthly = input.startingSigned + signedMonthlyFromQuotes;
  const recurringClients = new Set(signed.filter((q) => q.monthlyNet > 0).map((q) => q.clientId));
  const activeClients = input.startingSignedClients + recurringClients.size;

  const group = (arr: RevenueQuote[], key: (q: RevenueQuote) => string) => {
    const m = new Map<string, number>();
    for (const q of arr) m.set(key(q) || "Unclassified", (m.get(key(q) || "Unclassified") ?? 0) + q.monthlyNet);
    return [...m.entries()].map(([label, monthly]) => ({ label, monthly })).sort((a, b) => b.monthly - a.monthly);
  };
  const byOffer = new Map<string, number>();
  for (const q of signed) for (const o of q.offerMonthly) byOffer.set(o.offerName, (byOffer.get(o.offerName) ?? 0) + o.monthly);

  return {
    targetMonthly: input.targetMonthly,
    signedMonthly,
    signedMonthlyFromQuotes,
    startingSigned: input.startingSigned,
    gap: Math.max(0, input.targetMonthly - signedMonthly),
    progress: input.targetMonthly > 0 ? Math.min(1, signedMonthly / input.targetMonthly) : 0,
    activeClients,
    averagePerClient: activeClients > 0 ? Math.round(signedMonthly / activeClients) : 0,
    signedOneTime: sum(signed, (q) => q.oneTimeNet),
    signedAnnual: sum(signed, (q) => q.annualNet),
    pipelineMonthly: sum(open, (q) => q.monthlyNet),
    pipelineOneTime: sum(open, (q) => q.oneTimeNet),
    openCount: open.length,
    won: signed.length,
    lost: lost.length,
    expired: expired.length,
    byIndustry: group(signed, (q) => q.industryName),
    byOffer: [...byOffer.entries()].map(([label, monthly]) => ({ label, monthly })).sort((a, b) => b.monthly - a.monthly),
    cashCollected: input.cashCollected,
  };
}
