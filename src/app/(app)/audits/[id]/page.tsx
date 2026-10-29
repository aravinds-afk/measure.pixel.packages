import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BUSINESS_GOALS } from "@/data/defaults";
import { requirePageUser } from "@/server/auth";
import { loadCatalogRows } from "@/server/catalog";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { AuditWorkspace, type AuditWorkspaceProps } from "./workspace";

export const metadata = { title: "Brand audit" };

export default async function AuditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ discover?: string; step?: string }> }) {
  await requirePageUser();
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const [audit] = await db.select().from(s.audits).where(eq(s.audits.id, id));
  if (!audit) notFound();
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, audit.clientId));
  const rows = await loadCatalogRows(db);

  const props: AuditWorkspaceProps = {
    audit: {
      id: audit.id,
      rev: audit.rev,
      status: audit.status,
      industryId: audit.industryId,
      goals: audit.goals,
      goalNotes: audit.goalNotes,
      painOfferIds: audit.painOfferIds,
      budgetMonthly: audit.budgetMonthly,
      readiness: (audit.readiness as AuditWorkspaceProps["audit"]["readiness"]) ?? null,
      responses: audit.responses,
      customItems: audit.customItems,
      consultantNotes: audit.consultantNotes,
      discovery: (audit.discovery as AuditWorkspaceProps["audit"]["discovery"]) ?? null,
      createdAt: audit.createdAt,
    },
    client: {
      id: client.id,
      businessName: client.businessName,
      website: client.website,
      contactPerson: client.contactPerson,
      phone: client.phone,
      email: client.email,
      instagram: client.instagram,
      linkedin: client.linkedin,
      youtube: client.youtube,
    },
    categories: rows.categories.map((c) => ({ id: c.id, name: c.name })),
    items: rows.auditItems.filter((i) => i.active).map((i) => ({ id: i.id, categoryId: i.categoryId, label: i.label, help: i.help, priority: i.priority, serviceIds: i.serviceIds })),
    industries: rows.industries.filter((i) => i.active).map((i) => ({ id: i.id, name: i.name, clusterId: i.clusterId })),
    clusters: rows.clusters.map((c) => ({ id: c.id, name: c.name })),
    offers: rows.offers.filter((o) => o.active).map((o) => ({ id: o.id, number: o.number, name: o.name, buyerQuote: o.buyerQuote, clusterId: o.clusterId, audienceLabel: o.audienceLabel })),
    services: rows.services.filter((x) => x.active).map((x) => ({ id: x.id, name: x.name, linkId: x.linkId })),
    links: rows.links.map((l) => ({ id: l.id, name: l.name })),
    goals: BUSINESS_GOALS.map((g) => ({ id: g.id, label: g.label })),
    autoDiscover: sp.discover === "1" && !audit.discovery && !!client.website,
    initialStep: sp.step === "audit" || sp.step === "recommend" ? sp.step : "business",
  };
  return <AuditWorkspace {...props} />;
}
