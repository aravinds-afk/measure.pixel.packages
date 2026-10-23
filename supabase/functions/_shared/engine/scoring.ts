// Deterministic compatibility scoring. Every factor is normalised to 0–100, factors without
// enough data are excluded (their weight is redistributed) rather than scored as zero, and the
// total is Σ(factor score × effective weight).

import { clamp, humanList, isWildcardArea, isWildcardIndustry, matchSets, round, textOverlap, tokens } from "./normalize.ts";
import { buildOpportunities, buildScripts, categoryName, firstName, profileCompleteness } from "./referrals.ts";
import {
  adjacentSpheres, collaborationFor, getCategory, getSphere, sharedSpheres, triggersBetween, TRIGGERS,
} from "./taxonomy.ts";
import type {
  Adjustment, ChapterSettings, CompatibilityResult, Confidence, Evidence, FactorKey, FactorResult, MemberProfile,
  ReferralStat, ScoreBand, TriggerMatch, Weights,
} from "./types.ts";

export const ENGINE_VERSION = "1.0.0";

export const DEFAULT_WEIGHTS: Weights = {
  icp_overlap: 20,
  complementary_services: 20,
  referral_potential: 20,
  contact_sphere: 15,
  industry_overlap: 10,
  geographic_alignment: 5,
  shared_problems: 5,
  relationship_potential: 5,
};

export const DEFAULT_BANDS: ScoreBand[] = [
  { min: 90, label: "Exceptional Strategic Match" },
  { min: 75, label: "Strong Referral Partnership" },
  { min: 60, label: "Promising Business Connection" },
  { min: 40, label: "Potential Relationship to Explore" },
  { min: 0, label: "Limited Identified Synergy" },
];

export const DEFAULT_SETTINGS: ChapterSettings = { weights: DEFAULT_WEIGHTS, bands: DEFAULT_BANDS };

export const FACTOR_LABELS: Record<FactorKey, string> = {
  icp_overlap: "Ideal customer profile overlap",
  complementary_services: "Complementary services",
  referral_potential: "Referral potential in both directions",
  contact_sphere: "Contact sphere alignment",
  industry_overlap: "Industry and customer ecosystem overlap",
  geographic_alignment: "Geographic and market alignment",
  shared_problems: "Shared customer problems and solutions",
  relationship_potential: "Existing relationship or collaboration potential",
};

/** Points cap applied to direct competitors, so they are never presented as ideal partners. */
export const COMPETITOR_CAP = 49;

export function bandFor(score: number, bands: ScoreBand[] = DEFAULT_BANDS): string {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return (sorted.find((b) => score >= b.min) ?? sorted[sorted.length - 1]).label;
}

export function validateWeights(w: Partial<Weights>): { ok: boolean; total: number; errors: string[] } {
  const errors: string[] = [];
  let total = 0;
  for (const k of Object.keys(DEFAULT_WEIGHTS) as FactorKey[]) {
    const v = w[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) errors.push(`${FACTOR_LABELS[k]} must be between 0 and 100.`);
    else total += v;
  }
  if (Math.abs(total - 100) > 0.001) errors.push(`Weights must add up to 100% (currently ${round(total, 1)}%).`);
  return { ok: errors.length === 0, total, errors };
}

// ---- problem clusters --------------------------------------------------------

const PROBLEM_CLUSTERS: Record<string, string[]> = {
  "customer growth": ["lead", "sale", "marketing", "convert", "conversion", "visibility", "brand", "growth", "revenue", "enquiry", "traffic", "seo", "pipeline", "customer", "acquisition"],
  "money and funding": ["cash", "tax", "fund", "funding", "loan", "finance", "financial", "margin", "accounting", "book", "invest", "capital", "gst", "credit", "profit", "pricing", "cost"],
  "risk and compliance": ["compliance", "legal", "contract", "dispute", "insurance", "risk", "claim", "audit", "trademark", "ip", "regulation", "liability", "protection"],
  "people and teams": ["hire", "hiring", "staff", "employee", "team", "attrition", "payroll", "hr", "talent", "leadership", "training", "recruit"],
  "premises and property": ["office", "space", "property", "home", "construction", "renovation", "interior", "building", "power", "electricity", "cleaning", "plot", "lease"],
  "systems and technology": ["system", "software", "data", "cyber", "network", "cloud", "website", "app", "automation", "crm", "erp", "digital", "online"],
  "events and experiences": ["event", "launch", "gift", "celebration", "conference", "travel", "catering", "offsite"],
  "operations and supply chain": ["shipping", "delivery", "logistics", "packaging", "warehouse", "supply", "inventory", "damage"],
};

function clustersFor(items: string[]): Set<string> {
  const toks = new Set(items.flatMap((i) => tokens(i)));
  const out = new Set<string>();
  for (const [cluster, words] of Object.entries(PROBLEM_CLUSTERS)) {
    if (words.some((w) => toks.has(w) || [...toks].some((t) => t.startsWith(w)))) out.add(cluster);
  }
  return out;
}

// ---- factor helpers ----------------------------------------------------------

interface Partial0 {
  score: number | null;
  reasons: string[];
  evidence: Evidence[];
}

const md = (m: MemberProfile, field: string, text: string): Evidence => ({
  source: "member_data",
  provenance: m.fieldProvenance?.[field] ?? "member_submitted",
  text,
});

function icpFactor(a: MemberProfile, b: MemberProfile): Partial0 & { sharedCustomers: string[] } {
  const parts: { w: number; v: number }[] = [];
  const reasons: string[] = [];
  const evidence: Evidence[] = [];
  let sharedCustomers: string[] = [];
  if (a.customerSegments.length && b.customerSegments.length) {
    const m = matchSets(a.customerSegments, b.customerSegments);
    sharedCustomers = m.shared;
    parts.push({ w: 0.6, v: 0.75 * m.overlap + 0.25 * m.jaccard });
    if (m.shared.length) {
      reasons.push(`Both serve ${humanList(m.shared, 3)}.`);
      evidence.push(md(a, "customerSegments", `${firstName(a)}: ${humanList(a.customerSegments, 5)}`), md(b, "customerSegments", `${firstName(b)}: ${humanList(b.customerSegments, 5)}`));
    } else reasons.push("Their listed customer types do not overlap.");
  }
  if (a.companySizes.length && b.companySizes.length) {
    const m = matchSets(a.companySizes, b.companySizes);
    parts.push({ w: 0.25, v: m.overlap });
    if (m.shared.length) reasons.push(`Same customer company size: ${humanList(m.shared, 3)}.`);
    else reasons.push("They target different company sizes.");
  }
  if (!parts.length) return { score: null, reasons: ["Not enough customer-profile data on one or both profiles."], evidence, sharedCustomers };
  const wsum = parts.reduce((s, p) => s + p.w, 0);
  let score = (100 * parts.reduce((s, p) => s + p.w * p.v, 0)) / wsum;
  // Free-text ICP descriptions are noisy, so they can only add (up to 10 points), never subtract.
  if (a.icpDescription?.trim() && b.icpDescription?.trim()) {
    const t = textOverlap([a.icpDescription], [b.icpDescription]);
    if (t.shared.length) {
      score += Math.min(10, t.value * 20);
      reasons.push(`Their ideal-customer descriptions share: ${humanList(t.shared.slice(0, 4), 4)}.`);
    }
  }
  return { score: round(clamp(score)), reasons, evidence, sharedCustomers };
}

function complementFactor(a: MemberProfile, b: MemberProfile, competitor: boolean): Partial0 & { pairs: string[] } {
  const reasons: string[] = [];
  const evidence: Evidence[] = [];
  const svc = a.services.length && b.services.length ? matchSets(a.services, b.services) : null;
  const pairs: string[] = [];
  if (a.services.length && b.services.length) {
    const sharedSet = new Set(svc!.shared.map((s) => s.toLowerCase()));
    const ua = a.services.filter((s) => !sharedSet.has(s.toLowerCase())).slice(0, 3);
    const ub = b.services.filter((s) => !matchSets([s], svc!.shared).shared.length).slice(0, 3);
    if (ua.length && ub.length) pairs.push(`${firstName(a)}: ${humanList(ua, 3)} ↔ ${firstName(b)}: ${humanList(ub, 3)}`);
  }
  const ca = getCategory(a.categoryId);
  const cb = getCategory(b.categoryId);
  if (ca && cb) {
    let score: number;
    if (competitor) {
      const differentiated = svc ? svc.overlap < 0.25 : false;
      score = differentiated ? 45 : 20;
      reasons.push(differentiated ? "Same category, but their listed services are differentiated." : "Same professional category: they offer substantially the same services.");
      evidence.push({ source: "member_data", text: `Both are recorded as ${ca.name}.` });
      return { score, reasons, evidence, pairs };
    }
    const shared = sharedSpheres(ca.id, cb.id);
    const linked = triggersBetween(ca.id, cb.id).length + triggersBetween(cb.id, ca.id).length > 0;
    score = shared.length ? 80 : linked ? 70 : adjacentSpheres(ca.id, cb.id) ? 50 : 25;
    if (shared.length) reasons.push(`${ca.name} and ${cb.name} solve different problems for the same kind of client.`);
    else if (linked) reasons.push(`${ca.name} and ${cb.name} are different services that are often needed in sequence.`);
    else reasons.push(`${ca.name} and ${cb.name} rarely serve the same buying moment.`);
    const collab = collaborationFor(ca.id, cb.id);
    if (collab) {
      score += 15;
      reasons.push("There is an established joint-offer pattern for these professions.");
    }
    if (svc && svc.overlap > 0.5) {
      score -= 20;
      reasons.push(`Their services partly overlap (${humanList(svc.shared, 2)}); agree who leads on overlapping work.`);
    }
    evidence.push({ source: "profession_knowledge", text: `${ca.name} — ${ca.summary} ${cb.name} — ${cb.summary}` });
    return { score: clamp(score), reasons, evidence, pairs };
  }
  if (svc) {
    const score = svc.overlap > 0.5 ? 25 : 55;
    reasons.push(svc.overlap > 0.5 ? "Listed services overlap heavily; they may compete." : "Listed services are different; complementarity is unconfirmed because a category is unmapped.");
    return { score, reasons, evidence, pairs };
  }
  return { score: null, reasons: ["Category or services missing on one or both profiles."], evidence, pairs };
}

/** Directional referral likelihood giver → receiver, 0–1, plus the triggers behind it. */
export function directionalStrength(giver: MemberProfile, receiver: MemberProfile, icpFit: number | null) {
  const g = giver.categoryId;
  const r = receiver.categoryId;
  if (!getCategory(g) || !getCategory(r)) return { value: null as number | null, triggers: [] as typeof TRIGGERS };
  if (g === r) return { value: 0.2, triggers: [] as typeof TRIGGERS };
  const trig = triggersBetween(g, r);
  const t = trig.length ? Math.min(1, 0.45 + 0.2 * (trig.length - 1)) : 0;
  const shared = sharedSpheres(g, r).length > 0;
  const base = shared ? 0.35 : adjacentSpheres(g, r) ? 0.15 : 0.05;
  let v = Math.max(base, t) + (t > 0 && shared ? 0.1 : 0) + (t > 0 && collaborationFor(g, r) ? 0.1 : 0);
  if (icpFit != null) v *= 0.55 + 0.45 * icpFit;
  return { value: clamp(v, 0, 1), triggers: trig };
}

function sphereFactor(a: MemberProfile, b: MemberProfile): Partial0 & { shared: string[] } {
  const recorded = a.sphereIds.filter((s) => b.sphereIds.includes(s));
  const shared = sharedSpheres(a.categoryId, b.categoryId);
  if (recorded.length) {
    return { score: 100, shared, reasons: ["Both are recorded members of the same chapter contact sphere."], evidence: [{ source: "chapter_data", text: "Recorded contact-sphere membership." }] };
  }
  if (!getCategory(a.categoryId) || !getCategory(b.categoryId)) {
    return { score: null, shared, reasons: ["Category unmapped; sphere alignment cannot be assessed."], evidence: [] };
  }
  if (shared.length) {
    const names = shared.map((s) => getSphere(s)!.name);
    return { score: a.categoryId === b.categoryId ? 60 : 100, shared, reasons: [`Both professions belong to the ${humanList(names, 2)} sphere.`], evidence: [{ source: "profession_knowledge", text: getSphere(shared[0])!.description }] };
  }
  if (adjacentSpheres(a.categoryId, b.categoryId)) return { score: 55, shared, reasons: ["Their contact spheres are adjacent (they share partner professions)."], evidence: [] };
  return { score: 15, shared, reasons: ["Their professions sit in unrelated contact spheres."], evidence: [] };
}

function industryFactor(a: MemberProfile, b: MemberProfile): Partial0 & { shared: string[] } {
  if (!a.industries.length || !b.industries.length) return { score: null, shared: [], reasons: ["Industries served not listed on one or both profiles."], evidence: [] };
  if (a.industries.some(isWildcardIndustry) || b.industries.some(isWildcardIndustry)) {
    return { score: 70, shared: [], reasons: ["At least one member serves all industries."], evidence: [] };
  }
  const m = matchSets(a.industries, b.industries);
  if (!m.shared.length) return { score: 10, shared: [], reasons: ["No industries in common."], evidence: [] };
  return {
    score: round(100 * (0.7 * m.overlap + 0.3 * m.jaccard)),
    shared: m.shared,
    reasons: [`Common industries: ${humanList(m.shared, 4)}.`],
    evidence: [md(a, "industries", `${firstName(a)}: ${humanList(a.industries, 5)}`), md(b, "industries", `${firstName(b)}: ${humanList(b.industries, 5)}`)],
  };
}

function geoFactor(a: MemberProfile, b: MemberProfile): Partial0 & { shared: string[] } {
  if (!a.serviceAreas.length || !b.serviceAreas.length) return { score: null, shared: [], reasons: ["Service area missing on one or both profiles."], evidence: [] };
  const wa = a.serviceAreas.some(isWildcardArea);
  const wb = b.serviceAreas.some(isWildcardArea);
  const m = matchSets(a.serviceAreas, b.serviceAreas);
  if (m.shared.length) return { score: round(60 + 40 * m.overlap), shared: m.shared, reasons: [`Both operate in ${humanList(m.shared, 3)}.`], evidence: [] };
  if (wa && wb) return { score: 100, shared: [], reasons: ["Both serve clients nationally or online."], evidence: [] };
  if (wa || wb) return { score: 85, shared: [], reasons: [`${firstName(wa ? a : b)} serves clients anywhere, so location is not a barrier.`], evidence: [] };
  return { score: 25, shared: [], reasons: ["They serve different geographic markets."], evidence: [] };
}

function problemsFactor(a: MemberProfile, b: MemberProfile, complementary: boolean): Partial0 & { together: string[] } {
  if (!a.problemsSolved.length || !b.problemsSolved.length) return { score: null, together: [], reasons: ["Problems solved not listed on one or both profiles."], evidence: [] };
  const ca = clustersFor(a.problemsSolved);
  const cb = clustersFor(b.problemsSolved);
  const shared = [...ca].filter((c) => cb.has(c));
  const direct = textOverlap(a.problemsSolved, b.problemsSolved).value;
  const clusterScore = ca.size && cb.size ? shared.length / Math.min(ca.size, cb.size) : 0;
  const together = [
    ...shared.map((c) => `Both tackle ${c} problems for clients`),
    `${firstName(a)} solves ${humanList(a.problemsSolved.slice(0, 2).map((p) => p.toLowerCase()), 2)}; ${firstName(b)} solves ${humanList(b.problemsSolved.slice(0, 2).map((p) => p.toLowerCase()), 2)}`,
  ];
  // Adjacent problem spaces (e.g. money + growth) are valuable even when not identical.
  const adjacency = ca.size && cb.size && !shared.length ? (complementary ? 0.6 : 0.25) : 0;
  return {
    score: round(100 * Math.min(1, 0.7 * Math.max(clusterScore, adjacency) + 0.3 * direct + (shared.length ? 0.15 : 0))),
    together,
    reasons: shared.length ? [`Shared problem areas: ${humanList(shared, 3)}.`] : ["They solve different, adjacent client problems."],
    evidence: [md(a, "problemsSolved", `${firstName(a)}: ${humanList(a.problemsSolved, 4)}`), md(b, "problemsSolved", `${firstName(b)}: ${humanList(b.problemsSolved, 4)}`)],
  };
}

function relationshipFactor(a: MemberProfile, b: MemberProfile, stats: { aToB: number; bToA: number; closed: number }): Partial0 {
  const reasons: string[] = [];
  const evidence: Evidence[] = [];
  let score: number | null = null;
  const aLists = a.relationships.find((r) => r.memberId === b.id);
  const bLists = b.relationships.find((r) => r.memberId === a.id);
  if (aLists?.kind === "referral_partner" && bLists?.kind === "referral_partner") {
    score = 100;
    reasons.push("Both list each other as referral partners.");
  } else if (aLists?.kind === "referral_partner" || bLists?.kind === "referral_partner") {
    score = 80;
    reasons.push("One member lists the other as an existing referral partner.");
  } else if (aLists || bLists) {
    score = 75;
    reasons.push(`There is a recorded ${(aLists ?? bLists)!.kind} relationship.`);
  }
  if (aLists || bLists) evidence.push({ source: "member_data", provenance: (aLists ?? bLists)!.provenance, text: reasons[reasons.length - 1] });
  const refs = stats.aToB + stats.bToA;
  if (refs > 0) {
    score = Math.max(score ?? 0, Math.min(100, 70 + 10 * refs + (stats.closed ? 10 : 0)));
    reasons.push(`${refs} referral${refs === 1 ? "" : "s"} already recorded between them${stats.closed ? `, ${stats.closed} closed` : ""}.`);
    evidence.push({ source: "referral_history", text: `Recorded referrals: ${firstName(a)} → ${firstName(b)}: ${stats.aToB}, ${firstName(b)} → ${firstName(a)}: ${stats.bToA}.` });
  }
  if (score == null) {
    const collab = collaborationFor(a.categoryId, b.categoryId);
    if (collab) {
      score = 70;
      reasons.push(`No relationship recorded yet; collaboration potential: ${collab.idea}`);
      evidence.push({ source: "profession_knowledge", text: collab.idea });
    } else if (sharedSpheres(a.categoryId, b.categoryId).length && a.categoryId !== b.categoryId) {
      score = 55;
      reasons.push("No relationship recorded yet; same-sphere professions often collaborate.");
    } else {
      reasons.push("No recorded relationship or known collaboration pattern (not counted against the score).");
    }
  }
  return { score, reasons, evidence };
}

// ---- main entry --------------------------------------------------------------

export interface CompatibilityOptions {
  settings?: ChapterSettings;
  referralStats?: ReferralStat[];
  /** Category ids present (active) in the chapter, for gap and trigger mapping. */
  chapterCategoryIds?: string[];
  now?: Date;
}

export function pairStats(stats: ReferralStat[] | undefined, a: string, b: string) {
  let aToB = 0, bToA = 0, closed = 0;
  for (const s of stats ?? []) {
    if (s.giverId === a && s.receiverId === b) { aToB += s.count; closed += s.closed; }
    if (s.giverId === b && s.receiverId === a) { bToA += s.count; closed += s.closed; }
  }
  return { aToB, bToA, closed };
}

export function computeCompatibility(a: MemberProfile, b: MemberProfile, opts: CompatibilityOptions = {}): CompatibilityResult {
  if (a.id === b.id) throw new Error("Select two different members.");
  const settings = opts.settings ?? DEFAULT_SETTINGS;
  const weights = settings.weights;
  const competitor = !!a.categoryId && a.categoryId === b.categoryId;
  const stats = pairStats(opts.referralStats, a.id, b.id);

  const icp = icpFactor(a, b);
  const comp = complementFactor(a, b, competitor);
  const icpFit = icp.score == null ? null : icp.score / 100;
  const ab = directionalStrength(a, b, icpFit);
  const ba = directionalStrength(b, a, icpFit);
  let referral: Partial0;
  if (ab.value == null || ba.value == null) {
    referral = { score: null, reasons: ["Category unmapped on one profile; referral direction cannot be estimated."], evidence: [] };
  } else {
    const avg = (ab.value + ba.value) / 2;
    const min = Math.min(ab.value, ba.value);
    const reasons: string[] = [];
    if (ab.triggers.length) reasons.push(`${firstName(a)} can spot ${ab.triggers.length} trigger situation${ab.triggers.length > 1 ? "s" : ""} for ${firstName(b)}.`);
    if (ba.triggers.length) reasons.push(`${firstName(b)} can spot ${ba.triggers.length} trigger situation${ba.triggers.length > 1 ? "s" : ""} for ${firstName(a)}.`);
    if (Math.abs(ab.value - ba.value) > 0.3) reasons.push(`Referral flow is mostly one-way (${ab.value > ba.value ? `${firstName(a)} → ${firstName(b)}` : `${firstName(b)} → ${firstName(a)}`}).`);
    else if (min > 0.4) reasons.push("Referral potential is reciprocal.");
    if (!reasons.length) reasons.push("Few natural referral moments between these professions.");
    referral = {
      score: round(100 * (0.7 * avg + 0.3 * min)),
      reasons,
      evidence: [...ab.triggers, ...ba.triggers].slice(0, 4).map((t) => ({ source: "profession_knowledge" as const, text: t.situation })),
    };
  }
  const sphere = sphereFactor(a, b);
  const ind = industryFactor(a, b);
  const geo = geoFactor(a, b);
  const prob = problemsFactor(a, b, !competitor && sphere.shared.length > 0);
  const rel = relationshipFactor(a, b, stats);

  const raw: Record<FactorKey, Partial0> = {
    icp_overlap: icp,
    complementary_services: comp,
    referral_potential: referral,
    contact_sphere: sphere,
    industry_overlap: ind,
    geographic_alignment: geo,
    shared_problems: prob,
    relationship_potential: rel,
  };
  const keys = Object.keys(DEFAULT_WEIGHTS) as FactorKey[];
  const configuredTotal = keys.reduce((s, k) => s + (weights[k] ?? 0), 0) || 1;
  const availableTotal = keys.reduce((s, k) => s + (raw[k].score != null ? weights[k] ?? 0 : 0), 0);
  const factors: FactorResult[] = keys.map((k) => {
    const f = raw[k];
    const effectiveWeight = f.score != null && availableTotal > 0 ? ((weights[k] ?? 0) / availableTotal) * 100 : 0;
    return {
      key: k,
      label: FACTOR_LABELS[k],
      weight: round(((weights[k] ?? 0) / configuredTotal) * 100, 1),
      effectiveWeight: round(effectiveWeight, 1),
      score: f.score == null ? null : round(clamp(f.score)),
      contribution: f.score == null ? 0 : round((clamp(f.score) * effectiveWeight) / 100, 1),
      reasons: f.reasons,
      evidence: f.evidence,
    };
  });
  let score = round(factors.reduce((s, f) => s + (f.score == null ? 0 : (f.score * f.effectiveWeight) / 100), 0));
  const adjustments: Adjustment[] = [];
  if (competitor && score > COMPETITOR_CAP) {
    adjustments.push({
      key: "competitor_cap",
      label: "Direct competitor cap",
      description: `Both members are ${categoryName(a)}s. Direct competitors are capped at ${COMPETITOR_CAP} because referrals between them are limited to overflow or specialisation work.`,
      before: score,
      after: COMPETITOR_CAP,
    });
    score = COMPETITOR_CAP;
  }

  // Confidence: profile completeness plus the share of weight that could be evaluated.
  const ca = profileCompleteness(a);
  const cb = profileCompleteness(b);
  // The weaker profile dominates: one empty profile makes the whole assessment unreliable.
  const ra = ca.filled / ca.total;
  const rb = cb.filled / cb.total;
  const coverage = availableTotal / configuredTotal;
  const cval = round(0.5 * Math.min(ra, rb) + 0.2 * ((ra + rb) / 2) + 0.3 * coverage, 2);
  const level = cval >= 0.75 && coverage >= 0.5 ? "High" : cval >= 0.5 && coverage >= 0.5 ? "Medium" : "Low";
  const confidence: Confidence = {
    value: cval,
    level,
    missing: { memberA: ca.missing, memberB: cb.missing },
    note:
      level === "High"
        ? "Both profiles are well completed."
        : `${coverage < 1 ? `${round((1 - coverage) * 100)}% of the scoring weight could not be evaluated and was redistributed. ` : ""}Completing missing profile fields will make this assessment more reliable.`,
  };

  const sharedSphereIds = sphere.shared;
  const sharedSphereNames = sharedSphereIds.map((s) => getSphere(s)!.name);
  const aToB = buildOpportunities(a, b, { sharedCustomers: icp.sharedCustomers, triggers: ab.triggers, competitor, sharedSphereNames });
  const bToA = buildOpportunities(b, a, { sharedCustomers: icp.sharedCustomers, triggers: ba.triggers, competitor, sharedSphereNames });

  const chapterCats = new Set(opts.chapterCategoryIds ?? []);
  const triggerMatches: TriggerMatch[] = [
    ...ab.triggers.map((t) => ({ t, spotter: a.id, beneficiary: b.id })),
    ...ba.triggers.map((t) => ({ t, spotter: b.id, beneficiary: a.id })),
  ].map(({ t, spotter, beneficiary }) => ({
    id: t.id,
    situation: t.situation,
    spotter,
    beneficiary,
    words: t.words,
    categories: t.needs.filter((c) => chapterCats.has(c)),
  }));

  // Gaps: needs both members' clients have that neither of them covers.
  const gaps: string[] = [];
  const covered = new Set([a.categoryId, b.categoryId]);
  const spottedNeeds = new Map<string, number>();
  for (const t of TRIGGERS) {
    if (t.spottedBy.includes(a.categoryId ?? "") || t.spottedBy.includes(b.categoryId ?? "")) {
      for (const n of t.needs) if (!covered.has(n)) spottedNeeds.set(n, (spottedNeeds.get(n) ?? 0) + 1);
    }
  }
  for (const [cat, n] of [...spottedNeeds.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4)) {
    const name = getCategory(cat)!.name;
    gaps.push(chapterCats.size && !chapterCats.has(cat) ? `${name}: their clients need this and no chapter member offers it (recruitment opportunity)` : `${name}: needed by their clients but offered by neither (${n} trigger${n > 1 ? "s" : ""})`);
  }

  const collab = collaborationFor(a.categoryId, b.categoryId);
  const collaborationIdeas = [
    ...(collab ? [collab.idea] : []),
    ...(icp.sharedCustomers.length && !competitor ? [`Swap a list of the top 10 ${icp.sharedCustomers[0].toLowerCase()} each of you would like to meet, and agree who introduces whom.`] : []),
    ...(sharedSphereNames.length ? [`Co-present a ${sharedSphereNames[0]} education slot at a chapter meeting.`] : []),
  ];

  const label = bandFor(score, settings.bands);
  const headline = `${categoryName(a)} + ${categoryName(b)}`;
  const whyBullets: string[] = [];
  if (icp.sharedCustomers.length) whyBullets.push(`Both list ${humanList(icp.sharedCustomers, 3).toLowerCase()} as customers.`);
  if (ab.triggers[0]) whyBullets.push(`${firstName(a)} may encounter clients where ${ab.triggers[0].situation.charAt(0).toLowerCase() + ab.triggers[0].situation.slice(1)} — a need ${firstName(b)} serves.`);
  if (ba.triggers[0]) whyBullets.push(`${firstName(b)} may encounter clients where ${ba.triggers[0].situation.charAt(0).toLowerCase() + ba.triggers[0].situation.slice(1)} — a need ${firstName(a)} serves.`);
  if (competitor) whyBullets.push("They are in the same category: treat this as an overflow and specialisation relationship, not a primary referral partnership.");
  else if (comp.reasons[0]) whyBullets.push(comp.reasons[0]);
  if (sharedSphereNames.length && !competitor) whyBullets.push(`Both belong to the ${sharedSphereNames[0]} contact sphere.`);
  if (stats.aToB + stats.bToA > 0) whyBullets.push(`Proven: ${stats.aToB + stats.bToA} referrals already recorded between them.`);
  if (whyBullets.length < 2) whyBullets.push(...(raw.referral_potential.reasons.slice(0, 1)));
  whyBullets.push("Any introduction depends on the client's consent and actual needs.");

  const summary =
    `${label} (${score}/100, ${level.toLowerCase()} confidence). ` +
    (competitor
      ? `${firstName(a)} and ${firstName(b)} offer the same kind of service, so referrals are limited to overflow or specialist work.`
      : `${firstName(a)} (${categoryName(a)}) and ${firstName(b)} (${categoryName(b)}) ${icp.sharedCustomers.length ? `serve overlapping customers and ` : ""}${ab.triggers.length || ba.triggers.length ? "encounter situations that create needs for each other's services" : "have limited established referral patterns, so a one-to-one should focus on learning each other's ideal customers"}.`) +
    (stats.aToB + stats.bToA > 0 ? " Their referral history confirms the relationship." : " This is potential compatibility, not proven referral history.");

  return {
    memberAId: a.id,
    memberBId: b.id,
    score,
    label,
    exploratory: level === "Low",
    confidence,
    factors,
    adjustments,
    isCompetitor: competitor,
    sharedSpheres: sharedSphereIds,
    directional: { aToB: round((ab.value ?? 0) * 100), bToA: round((ba.value ?? 0) * 100) },
    headline,
    summary,
    whyBullets,
    matches: {
      sharedCustomers: icp.sharedCustomers,
      complementaryServices: comp.pairs,
      commonIndustries: ind.shared,
      sharedMarkets: geo.shared.length ? geo.shared : geo.score != null && geo.score >= 85 ? ["National / online reach"] : [],
      problemsTogether: prob.together,
      collaborationIdeas,
      gaps,
    },
    referrals: { aToB, bToA },
    triggers: triggerMatches,
    scripts: { aAboutB: buildScripts(a, b, aToB[0]), bAboutA: buildScripts(b, a, bToA[0]) },
    history: { ...stats, proven: stats.aToB + stats.bToA > 0 },
    weightsUsed: { ...weights },
    engineVersion: ENGINE_VERSION,
    computedAt: (opts.now ?? new Date()).toISOString(),
  };
}
