import type { AuditStatus, Priority, RuleTrigger } from "@/data/defaults";

/**
 * Deterministic recommendation engine. Pure: takes catalogue + rules + an
 * audit, returns three groups (offers, supporting services, already in place)
 * with the reasons behind each. No LLM, no prices invented: prices come from
 * the offer's stored bands.
 */

export type CatalogOffer = {
  id: string;
  number: number;
  name: string;
  clusterId: string | null;
  buyerQuote: string;
  components: { label: string; serviceIds: string[]; basis: string }[];
  upfrontKind: "setup" | "project";
  upfrontMin: number | null;
  upfrontMax: number | null;
  upfrontIncluded: boolean;
  monthlyMin: number | null;
  monthlyMax: number | null;
  monthlyTermMonths: number | null;
  suggestedIndustryIds: string[];
  active: boolean;
};

export type CatalogService = { id: string; name: string; linkId: string; active: boolean };
export type CatalogAuditItem = { id: string; label: string; priority: Priority; serviceIds: string[]; categoryId: string };
export type CatalogRule = { id: string; offerId: string; triggers: RuleTrigger[]; minScore: number; outcome: string; active: boolean };
export type CatalogDependency = { id: string; serviceId: string; requiresServiceId: string; reason: string; active: boolean };

export type AuditResponse = { status: AuditStatus; notes?: string; confirmedByClient?: boolean };

export type RecommendationInput = {
  industryId: string | null;
  industryClusterId: string | null;
  goals: string[];
  /** Offer ids whose buyer quote the client recognised. */
  painOfferIds: string[];
  responses: Record<string, AuditResponse>;
  budgetMonthly: number | null; // paise
  readiness: "now" | "next-quarter" | "exploring" | null;
};

export type Catalog = {
  offers: CatalogOffer[];
  services: CatalogService[];
  auditItems: CatalogAuditItem[];
  rules: CatalogRule[];
  dependencies: CatalogDependency[];
  goals: { id: string; label: string }[];
};

export type Evidence = { itemId: string; label: string; status: AuditStatus; priority: Priority; confirmedByClient: boolean };

export type OfferRecommendation = {
  key: string;
  offerId: string;
  name: string;
  score: number;
  priority: "high" | "medium" | "low";
  problems: Evidence[];
  goalsMatched: string[];
  quoteMatched: boolean;
  industryFit: "suggested" | "cluster" | "any" | "outside";
  why: string;
  outcome: string;
  components: { label: string; serviceIds: string[] }[];
  componentsInPlace: { label: string; serviceIds: string[] }[];
  dependencies: string[];
  missingInfo: string[];
  budgetNote: string | null;
  pricing: { upfrontKind: "setup" | "project"; upfrontMin: number | null; upfrontMax: number | null; upfrontIncluded: boolean; monthlyMin: number | null; monthlyMax: number | null; monthlyTermMonths: number | null };
};

export type ServiceRecommendation = {
  key: string;
  serviceId: string;
  name: string;
  priority: "high" | "medium" | "low";
  reason: string;
  kind: "gap" | "dependency";
  problems: Evidence[];
};

export type InPlaceItem = { key: string; serviceId: string; name: string; reason: "in_place" | "not_needed"; evidence: Evidence[] };

export type RecommendationResult = {
  offers: OfferRecommendation[];
  otherOffers: OfferRecommendation[];
  supporting: ServiceRecommendation[];
  inPlace: InPlaceItem[];
  notes: string[];
};

const GAP: AuditStatus[] = ["missing", "needs_improvement"];
const PRIORITY_RANK = { high: 3, medium: 2, low: 1 } as const;
export const MAX_PRIMARY_OFFERS = 3;

export function recommend(catalog: Catalog, input: RecommendationInput): RecommendationResult {
  const itemsById = new Map(catalog.auditItems.map((i) => [i.id, i]));
  const servicesById = new Map(catalog.services.filter((s) => s.active).map((s) => [s.id, s]));
  const goalLabel = new Map(catalog.goals.map((g) => [g.id, g.label]));
  const notes: string[] = [];

  const evidenceFor = (itemId: string): Evidence | null => {
    const item = itemsById.get(itemId);
    const r = input.responses[itemId];
    if (!item || !r) return null;
    return { itemId, label: item.label, status: r.status, priority: item.priority, confirmedByClient: !!r.confirmedByClient };
  };

  // Services already in place: an audit item rated "working well" covers its services.
  const inPlaceEvidence = new Map<string, Evidence[]>();
  for (const item of catalog.auditItems) {
    const r = input.responses[item.id];
    if (r?.status !== "working_well") continue;
    for (const sid of item.serviceIds) {
      if (!inPlaceEvidence.has(sid)) inPlaceEvidence.set(sid, []);
      inPlaceEvidence.get(sid)!.push(evidenceFor(item.id)!);
    }
  }
  // A service counts as in place only if no audit item mapped to it is a gap.
  const gapServices = new Set<string>();
  for (const item of catalog.auditItems) {
    if (GAP.includes(input.responses[item.id]?.status as AuditStatus)) item.serviceIds.forEach((s) => gapServices.add(s));
  }
  const inPlace = new Set([...inPlaceEvidence.keys()].filter((s) => !gapServices.has(s)));

  const assessed = Object.values(input.responses).filter((r) => r.status !== "not_assessed").length;
  if (assessed === 0) notes.push("No audit items assessed yet — recommendations need audit findings or a recognised buyer quote.");
  if (!input.industryId) notes.push("Industry not set — industry-specific offers are ranked without industry fit.");

  // ---- Offers -----------------------------------------------------------
  const scored: OfferRecommendation[] = [];
  for (const rule of catalog.rules) {
    if (!rule.active) continue;
    const offer = catalog.offers.find((o) => o.id === rule.offerId && o.active);
    if (!offer) continue;

    let industryFit: OfferRecommendation["industryFit"];
    if (offer.clusterId === null) industryFit = "any";
    else if (input.industryId && offer.suggestedIndustryIds.includes(input.industryId)) industryFit = "suggested";
    else if (input.industryClusterId && offer.clusterId === input.industryClusterId) industryFit = "cluster";
    else if (!input.industryId) industryFit = "cluster"; // unknown industry: don't exclude, don't boost
    else industryFit = "outside";
    if (industryFit === "outside") continue;

    let score = 0;
    const problems: Evidence[] = [];
    const supportingSignals: Evidence[] = [];
    const goalsMatched: string[] = [];
    for (const t of rule.triggers) {
      if (t.kind === "audit") {
        const ev = evidenceFor(t.itemId);
        if (!ev || !t.statuses.includes(ev.status)) continue;
        // Client-confirmed findings weigh slightly more.
        score += t.weight + (ev.confirmedByClient ? 1 : 0);
        if (GAP.includes(ev.status)) problems.push(ev);
        else supportingSignals.push(ev);
      } else if (input.goals.includes(t.goalId)) {
        score += t.weight;
        goalsMatched.push(goalLabel.get(t.goalId) ?? t.goalId);
      }
    }
    const quoteMatched = input.painOfferIds.includes(offer.id);
    if (quoteMatched) score += 4;
    if (industryFit === "suggested") score += 2;

    // Gate: must rest on an actual finding or the client's own words.
    if (problems.length === 0 && !quoteMatched) continue;

    problems.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);

    const offerServiceIds = offer.components.flatMap((c) => c.serviceIds);
    const componentsInPlace = offer.components.filter((c) => c.serviceIds.length > 0 && c.serviceIds.every((s) => inPlace.has(s)));
    const dependencies = catalog.dependencies
      .filter((d) => d.active && offerServiceIds.includes(d.serviceId) && !offerServiceIds.includes(d.requiresServiceId) && !inPlace.has(d.requiresServiceId))
      .map((d) => `${servicesById.get(d.serviceId)?.name ?? d.serviceId} → needs ${servicesById.get(d.requiresServiceId)?.name ?? d.requiresServiceId}: ${d.reason}`);

    const missingInfo: string[] = [];
    for (const t of rule.triggers) {
      if (t.kind !== "audit") continue;
      const r = input.responses[t.itemId];
      if (!r || r.status === "not_assessed") {
        const it = itemsById.get(t.itemId);
        if (it && it.priority === "high") missingInfo.push(`Not assessed: ${it.label}`);
      }
    }
    offer.components.filter((c) => c.basis === "unmapped").forEach((c) => missingInfo.push(`Component "${c.label}" has no catalogue service mapped — confirm scope`));

    let budgetNote: string | null = null;
    if (input.budgetMonthly != null && offer.monthlyMin != null && offer.monthlyMin > input.budgetMonthly) {
      budgetNote = "Lowest monthly band is above the stated monthly budget.";
    }

    const whyParts: string[] = [];
    if (quoteMatched) whyParts.push(`The client said: “${offer.buyerQuote}”`);
    if (problems.length) whyParts.push(`Audit shows: ${problems.slice(0, 3).map((p) => p.label.toLowerCase()).join("; ")}.`);
    if (supportingSignals.length) whyParts.push(`Already in place: ${supportingSignals.map((p) => p.label.toLowerCase()).join("; ")}.`);
    if (goalsMatched.length) whyParts.push(`Matches goals: ${goalsMatched.join(", ")}.`);

    const meetsThreshold = score >= rule.minScore;
    scored.push({
      key: `offer:${offer.id}`,
      offerId: offer.id,
      name: offer.name,
      score,
      priority: !meetsThreshold ? "low" : score >= rule.minScore + 6 ? "high" : "medium",
      problems,
      goalsMatched,
      quoteMatched,
      industryFit,
      why: whyParts.join(" "),
      outcome: rule.outcome,
      components: offer.components.map((c) => ({ label: c.label, serviceIds: c.serviceIds })),
      componentsInPlace,
      dependencies,
      missingInfo,
      budgetNote,
      pricing: {
        upfrontKind: offer.upfrontKind,
        upfrontMin: offer.upfrontMin,
        upfrontMax: offer.upfrontMax,
        upfrontIncluded: offer.upfrontIncluded,
        monthlyMin: offer.monthlyMin,
        monthlyMax: offer.monthlyMax,
        monthlyTermMonths: offer.monthlyTermMonths,
      },
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: exploring/unsure readiness favours the smaller monthly commitment.
    const am = a.pricing.monthlyMin ?? 0, bm = b.pricing.monthlyMin ?? 0;
    return input.readiness === "exploring" ? am - bm : bm - am;
  });

  const qualifying = scored.filter((o) => {
    const rule = catalog.rules.find((r) => r.offerId === o.offerId)!;
    return o.score >= rule.minScore;
  });
  const offers = qualifying.slice(0, MAX_PRIMARY_OFFERS);
  const otherOffers = scored.filter((o) => !offers.includes(o));

  // ---- Supporting services ---------------------------------------------
  const covered = new Set(offers.flatMap((o) => catalog.offers.find((x) => x.id === o.offerId)!.components.flatMap((c) => c.serviceIds)));
  const supportingMap = new Map<string, ServiceRecommendation>();
  for (const item of catalog.auditItems) {
    const ev = evidenceFor(item.id);
    if (!ev || !GAP.includes(ev.status)) continue;
    for (const sid of item.serviceIds) {
      if (covered.has(sid) || inPlace.has(sid)) continue;
      const svc = servicesById.get(sid);
      if (!svc) continue;
      const existing = supportingMap.get(sid);
      if (existing) {
        existing.problems.push(ev);
        if (PRIORITY_RANK[item.priority] > PRIORITY_RANK[existing.priority]) existing.priority = item.priority;
      } else {
        supportingMap.set(sid, { key: `service:${sid}`, serviceId: sid, name: svc.name, priority: item.priority, reason: "", kind: "gap", problems: [ev] });
      }
    }
  }
  for (const s of supportingMap.values()) {
    s.reason = `Addresses: ${s.problems.map((p) => p.label.toLowerCase()).join("; ")}.`;
  }

  // Dependencies of everything selected so far.
  const selectedServices = new Set([...covered, ...supportingMap.keys()]);
  for (const dep of catalog.dependencies) {
    if (!dep.active || !selectedServices.has(dep.serviceId)) continue;
    if (selectedServices.has(dep.requiresServiceId) || inPlace.has(dep.requiresServiceId)) continue;
    const svc = servicesById.get(dep.requiresServiceId);
    if (!svc || supportingMap.has(svc.id)) continue;
    supportingMap.set(svc.id, {
      key: `service:${svc.id}`,
      serviceId: svc.id,
      name: svc.name,
      priority: "medium",
      reason: `Dependency — ${dep.reason}`,
      kind: "dependency",
      problems: [],
    });
  }

  const supporting = [...supportingMap.values()].sort(
    (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.problems.length - a.problems.length,
  );

  const inPlaceList: InPlaceItem[] = [...inPlace]
    .map((sid) => servicesById.get(sid))
    .filter((s): s is CatalogService => !!s)
    .map((s) => ({ key: `inplace:${s.id}`, serviceId: s.id, name: s.name, reason: "in_place" as const, evidence: inPlaceEvidence.get(s.id) ?? [] }));

  // Not applicable findings: services that should not be sold right now.
  const notNeeded = new Map<string, Evidence[]>();
  for (const item of catalog.auditItems) {
    if (input.responses[item.id]?.status !== "not_applicable") continue;
    for (const sid of item.serviceIds) {
      if (gapServices.has(sid) || inPlace.has(sid) || covered.has(sid)) continue;
      if (!notNeeded.has(sid)) notNeeded.set(sid, []);
      notNeeded.get(sid)!.push(evidenceFor(item.id)!);
    }
  }
  for (const [sid, evidence] of notNeeded) {
    const s = servicesById.get(sid);
    if (s) inPlaceList.push({ key: `notneeded:${sid}`, serviceId: sid, name: s.name, reason: "not_needed", evidence });
  }

  return { offers, otherOffers, supporting, inPlace: inPlaceList, notes };
}
