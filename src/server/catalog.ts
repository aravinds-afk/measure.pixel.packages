import "server-only";
import { asc } from "drizzle-orm";
import { BUSINESS_GOALS, type RuleTrigger } from "@/data/defaults";
import type { Catalog } from "@/lib/recommend";
import type { DB } from "./db";
import { getDb } from "./db";
import * as s from "./db/schema";

export async function loadCatalogRows(db: DB = getDb()) {
  const [links, services, clusters, industries, offers, categories, auditItems, rules, deps] = await Promise.all([
    db.select().from(s.serviceLinks).orderBy(asc(s.serviceLinks.sortOrder)),
    db.select().from(s.services).orderBy(asc(s.services.sortOrder)),
    db.select().from(s.industryClusters).orderBy(asc(s.industryClusters.sortOrder)),
    db.select().from(s.industries).orderBy(asc(s.industries.sortOrder)),
    db.select().from(s.offers).orderBy(asc(s.offers.sortOrder)),
    db.select().from(s.auditCategories).orderBy(asc(s.auditCategories.sortOrder)),
    db.select().from(s.auditItems).orderBy(asc(s.auditItems.sortOrder)),
    db.select().from(s.recommendationRules),
    db.select().from(s.dependencyRules),
  ]);
  return { links, services, clusters, industries, offers, categories, auditItems, rules, deps };
}
export type CatalogRows = Awaited<ReturnType<typeof loadCatalogRows>>;

/** Shape consumed by the recommendation engine. Custom audit items are appended per audit. */
export function toEngineCatalog(rows: CatalogRows, customItems: s.CustomAuditItem[] = []): Catalog {
  return {
    offers: rows.offers.map((o) => ({
      id: o.id,
      number: o.number,
      name: o.name,
      clusterId: o.clusterId,
      buyerQuote: o.buyerQuote,
      components: o.components,
      upfrontKind: o.upfrontKind,
      upfrontMin: o.upfrontMin,
      upfrontMax: o.upfrontMax,
      upfrontIncluded: o.upfrontIncluded,
      monthlyMin: o.monthlyMin,
      monthlyMax: o.monthlyMax,
      monthlyTermMonths: o.monthlyTermMonths,
      suggestedIndustryIds: o.suggestedIndustryIds,
      active: o.active,
    })),
    services: rows.services.map((x) => ({ id: x.id, name: x.name, linkId: x.linkId, active: x.active })),
    auditItems: [
      ...rows.auditItems.filter((i) => i.active).map((i) => ({ id: i.id, label: i.label, priority: i.priority, serviceIds: i.serviceIds, categoryId: i.categoryId })),
      ...customItems.map((i) => ({ id: i.id, label: i.label, priority: i.priority, serviceIds: i.serviceIds, categoryId: i.categoryId })),
    ],
    rules: rows.rules.map((r) => ({ id: r.id, offerId: r.offerId, triggers: r.triggers as RuleTrigger[], minScore: r.minScore, outcome: r.outcome, active: r.active })),
    dependencies: rows.deps,
    goals: [...BUSINESS_GOALS],
  };
}
