import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import type { QuoteDoc } from "@/lib/quote-schema";
import type { QuoteTotals } from "@/lib/pricing";
import { requirePageUser } from "@/server/auth";
import { loadCatalogRows } from "@/server/catalog";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { getSettings } from "@/server/settings";
import { docForUser, effectiveStatus, totalsForUser, versionsOf } from "@/server/services/quotes";
import { QuoteWorkspace, type QuoteWorkspaceProps } from "./quote-workspace";

export const metadata = { title: "Quotation" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const db = getDb();
  const [q] = await db.select().from(s.quotes).where(eq(s.quotes.id, id));
  if (!q) notFound();
  const [rows, settings, versions, jobs] = await Promise.all([
    loadCatalogRows(db),
    getSettings(db),
    versionsOf(db, q.rootId),
    db.select().from(s.syncJobs).where(eq(s.syncJobs.entityId, q.id)).orderBy(asc(s.syncJobs.createdAt)),
  ]);
  const lastJob = jobs.at(-1);

  const props: QuoteWorkspaceProps = {
    quote: {
      id: q.id,
      number: q.number,
      version: q.version,
      status: effectiveStatus(q),
      storedStatus: q.status,
      rev: q.rev,
      issueDate: q.issueDate,
      validUntil: q.validUntil,
      publicToken: q.publicToken,
      auditId: q.auditId,
      clientId: q.clientId,
      updatedAt: q.updatedAt,
    },
    doc: docForUser(q.doc as QuoteDoc, user),
    serverTotals: totalsForUser(q.totals as QuoteTotals, user),
    versions: versions.map((v) => ({ id: v.id, version: v.version, status: effectiveStatus(v) })),
    sheets: lastJob ? { status: lastJob.status, error: lastJob.lastError, at: lastJob.updatedAt } : null,
    offers: rows.offers.filter((o) => o.active).map((o) => ({
      id: o.id, number: o.number, name: o.name, description: o.description, clusterId: o.clusterId, audienceLabel: o.audienceLabel, buyerQuote: o.buyerQuote,
      components: o.components, upfrontKind: o.upfrontKind, upfrontMin: o.upfrontMin, upfrontMax: o.upfrontMax, upfrontIncluded: o.upfrontIncluded,
      monthlyMin: o.monthlyMin, monthlyMax: o.monthlyMax, monthlyTermMonths: o.monthlyTermMonths,
      deliveryCostOneTime: user.role === "admin" ? o.deliveryCostOneTime : 0, deliveryCostMonthly: user.role === "admin" ? o.deliveryCostMonthly : 0,
    })),
    services: rows.services.filter((x) => x.active).map((x) => ({
      id: x.id, name: x.name, description: x.description, linkId: x.linkId, industryIds: x.industryIds, priceOptions: x.priceOptions,
      deliveryCostOneTime: user.role === "admin" ? x.deliveryCostOneTime : 0, deliveryCostMonthly: user.role === "admin" ? x.deliveryCostMonthly : 0,
    })),
    links: rows.links.map((l) => ({ id: l.id, name: l.name })),
    industries: rows.industries.filter((i) => i.active).map((i) => ({ id: i.id, name: i.name, clusterId: i.clusterId })),
    clusters: rows.clusters.map((c) => ({ id: c.id, name: c.name })),
    company: settings.company,
    maxDiscountPercent: settings.pricing.consultantMaxDiscountPercent,
    user: { role: user.role, canOverridePrices: user.canOverridePrices },
    appUrl: process.env.APP_URL?.replace(/\/$/, "") ?? "",
  };
  return <QuoteWorkspace {...props} />;
}
