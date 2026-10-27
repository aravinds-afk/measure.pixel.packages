import { sql } from "drizzle-orm";
import { OFFERS, SERVICE_LINKS, SERVICES, INDUSTRY_CLUSTERS, INDUSTRIES } from "@/data/opportunity-board";
import {
  AUDIT_CATEGORIES,
  AUDIT_ITEMS,
  BRIEF_EXAMPLE_PRICE_OPTIONS,
  DEFAULT_SETTINGS,
  DEPENDENCY_RULES,
  INDUSTRY_KEYWORDS,
  RECOMMENDATION_RULES,
} from "@/data/defaults";
import { rupeesToPaise } from "@/lib/money";
import type { DB } from "./db";
import * as s from "./db/schema";

const p = (n: number | null | undefined) => (n == null ? null : rupeesToPaise(n));

export function sourceOfferRow(o: (typeof OFFERS)[number], i: number) {
  return {
    id: o.id,
    number: o.number,
    name: o.name,
    clusterId: o.clusterId,
    audienceLabel: o.audienceLabel,
    buyerQuote: o.buyerQuote,
    components: o.components,
    upfrontKind: o.upfrontKind,
    upfrontMin: p(o.upfront?.min),
    upfrontMax: p(o.upfront?.max),
    upfrontIncluded: !!o.upfrontIncluded,
    monthlyMin: p(o.monthly?.min),
    monthlyMax: p(o.monthly?.max),
    monthlyTermMonths: o.monthlyTermMonths ?? null,
    suggestedIndustryIds: o.suggestedIndustryIds,
    sortOrder: i,
    origin: "opportunity_board" as const,
  };
}

export function sourceServiceRow(svc: (typeof SERVICES)[number], i: number) {
  const options = (BRIEF_EXAMPLE_PRICE_OPTIONS[svc.id] ?? []).map((o) => ({
    ...o,
    unitPrice: p(o.unitPrice) ?? undefined,
    setupFee: p(o.setupFee) ?? undefined,
    monthlyFee: p(o.monthlyFee) ?? undefined,
    annualFee: p(o.annualFee) ?? undefined,
  }));
  return {
    id: svc.id,
    name: svc.name,
    linkId: svc.linkId,
    priceOptions: options,
    defaultModel: options[0]?.model ?? "custom",
    sortOrder: i,
    origin: "opportunity_board" as const,
  };
}

/**
 * Idempotent: inserts missing rows only, so admin edits survive re-seeding.
 * Board-derived rows carry their original in source_snapshot.
 */
export async function seedCatalog(db: DB) {
  for (const l of SERVICE_LINKS) {
    await db.insert(s.serviceLinks).values({ id: l.id, name: l.name, sortOrder: l.order, note: l.note ?? null, sourceSnapshot: l }).onConflictDoNothing();
  }
  for (const [i, svc] of SERVICES.entries()) {
    await db.insert(s.services).values({ ...sourceServiceRow(svc, i), sourceSnapshot: svc }).onConflictDoNothing();
  }
  for (const c of INDUSTRY_CLUSTERS) {
    await db.insert(s.industryClusters).values({ id: c.id, name: c.name, sortOrder: c.order, sourceSnapshot: c }).onConflictDoNothing();
  }
  for (const [i, ind] of INDUSTRIES.entries()) {
    await db
      .insert(s.industries)
      .values({ id: ind.id, name: ind.name, clusterId: ind.clusterId, keywords: INDUSTRY_KEYWORDS[ind.id] ?? [], sortOrder: i, origin: "opportunity_board", sourceSnapshot: ind })
      .onConflictDoNothing();
  }
  for (const [i, o] of OFFERS.entries()) {
    await db.insert(s.offers).values({ ...sourceOfferRow(o, i), sourceSnapshot: o as unknown as Record<string, unknown> }).onConflictDoNothing();
  }
  for (const [i, c] of AUDIT_CATEGORIES.entries()) {
    await db.insert(s.auditCategories).values({ id: c.id, name: c.name, sortOrder: i }).onConflictDoNothing();
  }
  for (const [i, it] of AUDIT_ITEMS.entries()) {
    await db
      .insert(s.auditItems)
      .values({ id: it.id, categoryId: it.categoryId, label: it.label, help: it.help ?? "", priority: it.priority, serviceIds: it.serviceIds, autoCheck: it.autoCheck ?? null, sortOrder: i })
      .onConflictDoNothing();
  }
  for (const r of RECOMMENDATION_RULES) {
    await db.insert(s.recommendationRules).values({ id: r.id, offerId: r.offerId, triggers: r.triggers, minScore: r.minScore, outcome: r.outcome }).onConflictDoNothing();
  }
  for (const d of DEPENDENCY_RULES) {
    await db.insert(s.dependencyRules).values(d).onConflictDoNothing();
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(s.settings).values({ key, value: rupeeSettings(key, value) }).onConflictDoNothing();
  }
  await db.run(sql`select 1`);
}

/** Settings store money in paise like everything else. */
function rupeeSettings(key: string, value: unknown) {
  if (key !== "revenue") return value;
  const r = value as typeof DEFAULT_SETTINGS.revenue;
  return { ...r, targetMonthly: rupeesToPaise(r.targetMonthly), startingSigned: rupeesToPaise(r.startingSigned), profitFloorMonthly: rupeesToPaise(r.profitFloorMonthly) };
}
