import "server-only";
import { eq } from "drizzle-orm";
import { emptyDoc, lineFromOffer, lineFromService } from "@/lib/lines";
import type { QuoteDoc } from "@/lib/quote-schema";
import type { DB } from "../db";
import * as s from "../db/schema";
import { HttpError } from "../http";
import type { Settings } from "../settings";
import { computeRecommendations } from "./audits";

/** First draft of a quotation from an audit's accepted recommendations. */
export async function docFromAudit(db: DB, settings: Settings, auditId: string): Promise<{ doc: QuoteDoc; clientId: string }> {
  const [audit] = await db.select().from(s.audits).where(eq(s.audits.id, auditId));
  if (!audit) throw new HttpError(404, "Audit not found");
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, audit.clientId));
  const [industry] = audit.industryId ? await db.select().from(s.industries).where(eq(s.industries.id, audit.industryId)) : [];
  const recs = await db.select().from(s.recommendations).where(eq(s.recommendations.auditId, auditId));
  const [offers, services] = await Promise.all([db.select().from(s.offers), db.select().from(s.services)]);
  const { result } = await computeRecommendations(db, auditId);
  const inPlace = new Set(result.inPlace.filter((x) => x.reason === "in_place").map((x) => x.serviceId));

  const doc = emptyDoc(settings);
  doc.client = {
    businessName: client.businessName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone,
    website: client.website,
    industryName: industry?.name ?? "",
  };

  const accepted = recs.filter((r) => r.decision === "accepted");
  for (const r of accepted.filter((x) => x.offerId)) {
    const o = offers.find((x) => x.id === r.offerId);
    if (!o) continue;
    const line = lineFromOffer(o, r.id);
    // Components the client already has are shown as excluded; price is the consultant's call.
    line.deliverables = line.deliverables.map((d) => ({ ...d, included: !(d.serviceIds.length > 0 && d.serviceIds.every((sid) => inPlace.has(sid))) }));
    if (line.deliverables.some((d) => !d.included)) line.internalNote = "Some components are already in place — review scope and price within the band.";
    doc.items.push(line);
  }
  for (const r of accepted.filter((x) => x.serviceId && x.group !== "in_place")) {
    const svc = services.find((x) => x.id === r.serviceId);
    if (svc) doc.items.push(lineFromService(svc, undefined, r.id));
  }
  if (doc.items.some((i) => i.termMonths)) doc.billing.contractMonths = Math.max(...doc.items.map((i) => i.termMonths ?? 0));

  const problems = result.offers.flatMap((o) => o.problems).concat(result.supporting.flatMap((x) => x.problems));
  const uniqueProblems = [...new Map(problems.map((p) => [p.itemId, p])).values()].slice(0, 6);
  doc.summary.needs = uniqueProblems.length
    ? `What we found:\n${uniqueProblems.map((p) => `• ${p.label}${p.status === "missing" ? " — not in place" : " — needs improvement"}`).join("\n")}`
    : "";
  const offerNames = doc.items.filter((i) => i.kind === "offer").map((i) => i.name);
  const outcomes = result.offers.filter((o) => offerNames.includes(o.name)).map((o) => o.outcome);
  doc.summary.solution = offerNames.length ? `${offerNames.join(" + ")}.\n${outcomes.join("\n")}` : "";
  return { doc, clientId: client.id };
}
