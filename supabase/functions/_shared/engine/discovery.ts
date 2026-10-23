// Chapter-level intelligence: best matches, partner search, next referrals, contact spheres,
// missing categories and one-to-one meeting briefs. All built on computeCompatibility.

import { clamp, humanList, round, tokens } from "./normalize.ts";
import { categoryName, firstName, profileCompleteness } from "./referrals.ts";
import { computeCompatibility, pairStats, type CompatibilityOptions } from "./scoring.ts";
import { CATEGORIES, getCategory, SPHERES, TRIGGERS, triggersBetween } from "./taxonomy.ts";
import type { CompatibilityResult, MemberProfile, ReferralOpportunity } from "./types.ts";

const active = (ms: MemberProfile[]) => ms.filter((m) => m.status === "active");

export function chapterCategoryIds(members: MemberProfile[]): string[] {
  return [...new Set(active(members).map((m) => m.categoryId).filter((c): c is string => !!c))];
}

export interface MatchSummary {
  member: MemberProfile;
  score: number;
  label: string;
  confidence: CompatibilityResult["confidence"]["level"];
  isCompetitor: boolean;
  topReason: string;
  directional: CompatibilityResult["directional"];
}

function summarise(other: MemberProfile, r: CompatibilityResult): MatchSummary {
  return {
    member: other,
    score: r.score,
    label: r.label,
    confidence: r.confidence.level,
    isCompetitor: r.isCompetitor,
    topReason: r.whyBullets[0] ?? r.summary,
    directional: r.directional,
  };
}

/** Compute the full pairwise matrix once (n ≤ ~100 members per chapter; this is cheap). */
export function pairMatrix(members: MemberProfile[], opts: CompatibilityOptions = {}): Map<string, CompatibilityResult> {
  const list = active(members);
  const cats = opts.chapterCategoryIds ?? chapterCategoryIds(list);
  const out = new Map<string, CompatibilityResult>();
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const r = computeCompatibility(list[i], list[j], { ...opts, chapterCategoryIds: cats });
      out.set(`${list[i].id}|${list[j].id}`, r);
      out.set(`${list[j].id}|${list[i].id}`, r);
    }
  }
  return out;
}

const CONF_RANK = { High: 1, Medium: 0.9, Low: 0.7 } as const;
const rankValue = (m: MatchSummary) => m.score * CONF_RANK[m.confidence];

export function bestMatches(me: MemberProfile, members: MemberProfile[], opts: CompatibilityOptions = {}, limit = 10): MatchSummary[] {
  const cats = opts.chapterCategoryIds ?? chapterCategoryIds(members);
  return active(members)
    .filter((m) => m.id !== me.id)
    .map((m) => summarise(m, computeCompatibility(me, m, { ...opts, chapterCategoryIds: cats })))
    // Rank by score discounted for low confidence; competitors go last.
    .sort((x, y) => Number(x.isCompetitor) - Number(y.isCompetitor) || rankValue(y) - rankValue(x))
    .slice(0, limit);
}

export interface PartnerHit {
  member: MemberProfile;
  relevance: number; // 0–100
  reasons: string[];
  basis: "member_data" | "profession_knowledge";
}

/** Find members who can help a customer type or problem described in free text. */
export function findPartners(query: string, members: MemberProfile[], excludeId?: string): PartnerHit[] {
  const q = new Set(tokens(query));
  if (!q.size) return [];
  const hits: PartnerHit[] = [];
  for (const m of active(members)) {
    if (m.id === excludeId) continue;
    const reasons: string[] = [];
    let dataScore = 0;
    const fields: [string, string[], number][] = [
      ["services", m.services, 3],
      ["problems solved", m.problemsSolved, 3],
      ["customer types", m.customerSegments, 2],
      ["industries", m.industries, 1.5],
      ["keywords", m.keywords, 2],
      ["description", m.businessDescription ? [m.businessDescription] : [], 1],
      ["ideal referral", m.idealReferral ? [m.idealReferral] : [], 2],
      ["category", [categoryName(m)], 3],
    ];
    for (const [label, items, w] of fields) {
      const matched = items.filter((it) => tokens(it).some((t) => q.has(t)));
      if (matched.length) {
        dataScore += w * Math.min(2, matched.length);
        reasons.push(`Matches ${label}: ${humanList(matched.slice(0, 2), 2)}`);
      }
    }
    let knowledgeScore = 0;
    const cat = getCategory(m.categoryId);
    if (cat) {
      const kItems = [...cat.typicalProblems, ...cat.triggerWords, ...cat.aliases, cat.summary];
      const km = kItems.filter((it) => tokens(it).some((t) => q.has(t)));
      if (km.length) {
        knowledgeScore = Math.min(6, km.length * 1.5);
        if (!dataScore) reasons.push(`A ${cat.name} typically handles: ${humanList(km.slice(0, 2), 2)}`);
      }
    }
    const total = dataScore + knowledgeScore * 0.6;
    if (total > 0) hits.push({ member: m, relevance: round(clamp((total / 14) * 100)), reasons, basis: dataScore ? "member_data" : "profession_knowledge" });
  }
  return hits.sort((a, b) => b.relevance - a.relevance).slice(0, 12);
}

export interface NextReferral {
  receiver: MemberProfile;
  opportunity: ReferralOpportunity;
  strength: number;
}

/** Referral opportunities `me` should look for in their own network this week. */
export function nextReferrals(me: MemberProfile, members: MemberProfile[], opts: CompatibilityOptions = {}, limit = 8): NextReferral[] {
  const cats = opts.chapterCategoryIds ?? chapterCategoryIds(members);
  const out: NextReferral[] = [];
  for (const m of active(members)) {
    if (m.id === me.id) continue;
    const r = computeCompatibility(me, m, { ...opts, chapterCategoryIds: cats });
    const opp = r.referrals.aToB[0];
    if (!opp || r.isCompetitor) continue;
    const rank = { High: 1, Medium: 0.8, Low: 0.5, Exploratory: 0.3 }[opp.confidence];
    out.push({ receiver: m, opportunity: opp, strength: round(r.directional.aToB * rank) });
  }
  return out.sort((a, b) => b.strength - a.strength).slice(0, limit);
}

// ---- contact spheres -----------------------------------------------------------

export interface SphereAnalysis {
  id: string;
  name: string;
  description: string;
  fitScore: number | null;
  fitBreakdown: { customerOverlap: number | null; complementarity: number; mutualReferral: number | null; referralFrequency: number; geographic: number | null };
  present: { member: MemberProfile; role: string }[];
  recorded: MemberProfile[];
  missing: { categoryId: string; name: string; role: string; priority: number; beneficiaries: string[] }[];
  strongest: { a: MemberProfile; b: MemberProfile; score: number; reason: string }[];
  coordinator: { member: MemberProfile; reason: string } | null;
  recommendedOneToOnes: { a: MemberProfile; b: MemberProfile; score: number }[];
  referralDirections: { from: string; to: string; triggers: number }[];
}

function avg(nums: (number | null)[]): number | null {
  const v = nums.filter((n): n is number => n != null);
  return v.length ? v.reduce((s, n) => s + n, 0) / v.length : null;
}

export function analyseSpheres(members: MemberProfile[], opts: CompatibilityOptions = {}, matrix?: Map<string, CompatibilityResult>): SphereAnalysis[] {
  const list = active(members);
  const cats = chapterCategoryIds(list);
  const mx = matrix ?? pairMatrix(list, { ...opts, chapterCategoryIds: cats });
  const results: SphereAnalysis[] = [];
  for (const sphere of SPHERES) {
    const roleCats = Object.keys(sphere.roles);
    const present = list.filter((m) => m.categoryId && roleCats.includes(m.categoryId)).map((m) => ({ member: m, role: sphere.roles[m.categoryId!] }));
    const recorded = list.filter((m) => m.sphereIds.includes(sphere.id));
    const pm = present.map((p) => p.member);
    const pairs: CompatibilityResult[] = [];
    for (let i = 0; i < pm.length; i++) for (let j = i + 1; j < pm.length; j++) pairs.push(mx.get(`${pm[i].id}|${pm[j].id}`)!);
    const f = (k: string) => avg(pairs.map((p) => p.factors.find((x) => x.key === k)!.score));
    const distinct = new Set(pm.map((m) => m.categoryId));
    const complementarity = round((distinct.size / roleCats.length) * 100);
    let internalTriggers = 0;
    const directions: SphereAnalysis["referralDirections"] = [];
    for (const g of pm) for (const r of pm) {
      if (g.id === r.id) continue;
      const n = triggersBetween(g.categoryId, r.categoryId).length;
      if (n) { internalTriggers += n; directions.push({ from: g.id, to: r.id, triggers: n }); }
    }
    const frequency = pm.length > 1 ? round(clamp((internalTriggers / (pm.length * (pm.length - 1))) * 100 * 1.5)) : 0;
    const parts: [number | null, number][] = [[f("icp_overlap"), 0.25], [complementarity, 0.2], [f("referral_potential"), 0.25], [frequency, 0.15], [f("geographic_alignment"), 0.15]];
    const avail = parts.filter(([v]) => v != null);
    const fitScore = pm.length >= 2 && avail.length ? round(avail.reduce((s, [v, w]) => s + v! * w, 0) / avail.reduce((s, [, w]) => s + w, 0)) : null;

    const missing = roleCats
      .filter((c) => !cats.includes(c))
      .map((c) => {
        const beneficiaries = pm.filter((m) => triggersBetween(m.categoryId, c).length || triggersBetween(c, m.categoryId).length);
        return { categoryId: c, name: getCategory(c)!.name, role: sphere.roles[c], priority: beneficiaries.length, beneficiaries: beneficiaries.map((m) => m.id) };
      })
      .sort((a, b) => b.priority - a.priority);

    const strongest = pairs
      .filter((p) => !p.isCompetitor)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((p) => ({ a: list.find((m) => m.id === p.memberAId)!, b: list.find((m) => m.id === p.memberBId)!, score: p.score, reason: p.whyBullets[0] ?? "" }));

    let coordinator: SphereAnalysis["coordinator"] = null;
    if (pm.length >= 2) {
      const ranked = pm
        .map((m) => {
          const total = pm.filter((o) => o.id !== m.id).reduce((s, o) => s + mx.get(`${m.id}|${o.id}`)!.score, 0);
          const c = profileCompleteness(m);
          return { m, v: total / (pm.length - 1) + (c.filled / c.total) * 10 };
        })
        .sort((a, b) => b.v - a.v);
      coordinator = { member: ranked[0].m, reason: `Highest average compatibility with the rest of this sphere and a well-completed profile; a natural person to convene sphere one-to-ones.` };
    }

    const recommendedOneToOnes = pairs
      .filter((p) => !p.isCompetitor && p.score >= 60 && !p.history.proven)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((p) => ({ a: list.find((m) => m.id === p.memberAId)!, b: list.find((m) => m.id === p.memberBId)!, score: p.score }));

    results.push({
      id: sphere.id,
      name: sphere.name,
      description: sphere.description,
      fitScore,
      fitBreakdown: {
        customerOverlap: f("icp_overlap") == null ? null : round(f("icp_overlap")!),
        complementarity,
        mutualReferral: f("referral_potential") == null ? null : round(f("referral_potential")!),
        referralFrequency: frequency,
        geographic: f("geographic_alignment") == null ? null : round(f("geographic_alignment")!),
      },
      present,
      recorded,
      missing,
      strongest,
      coordinator,
      recommendedOneToOnes,
      referralDirections: directions,
    });
  }
  return results.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
}

/** Contact Sphere Fit for one member against each sphere (0–100). */
export function memberSphereFit(me: MemberProfile, analyses: SphereAnalysis[], matrix: Map<string, CompatibilityResult>) {
  return analyses
    .map((s) => {
      const others = s.present.map((p) => p.member).filter((m) => m.id !== me.id);
      const scores = others.map((o) => matrix.get(`${me.id}|${o.id}`)?.score).filter((n): n is number => n != null);
      const inTemplate = !!me.categoryId && !!getSphere0(s.id)?.roles[me.categoryId];
      const fit = scores.length ? round(scores.reduce((a, b) => a + b, 0) / scores.length * (inTemplate ? 1 : 0.8)) : null;
      return { sphereId: s.id, name: s.name, fit, inTemplate };
    })
    .sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));
}

function getSphere0(id: string) {
  return SPHERES.find((s) => s.id === id);
}

export interface MissingCategory {
  categoryId: string;
  name: string;
  spheres: string[];
  priority: number;
  /** Members whose clients regularly need this profession. */
  wouldBenefit: string[];
  reason: string;
}

export function missingCategories(members: MemberProfile[]): MissingCategory[] {
  const list = active(members);
  const present = new Set(chapterCategoryIds(list));
  const out: MissingCategory[] = [];
  for (const cat of CATEGORIES) {
    if (present.has(cat.id)) continue;
    const benefit = list.filter((m) => triggersBetween(m.categoryId, cat.id).length > 0);
    const gives = list.filter((m) => triggersBetween(cat.id, m.categoryId).length > 0);
    const priority = benefit.length * 2 + gives.length;
    if (!priority) continue;
    out.push({
      categoryId: cat.id,
      name: cat.name,
      spheres: cat.spheres.map((s) => getSphere0(s)!.name),
      priority,
      wouldBenefit: benefit.map((m) => m.id),
      reason: `${benefit.length} member${benefit.length === 1 ? "" : "s"} regularly encounter clients who need a ${cat.name}; a ${cat.name} could refer to ${gives.length} existing member${gives.length === 1 ? "" : "s"}.`,
    });
  }
  return out.sort((a, b) => b.priority - a.priority);
}

// ---- one-to-one brief ------------------------------------------------------------

export interface MeetingBrief {
  memberAId: string;
  memberBId: string;
  score: number;
  label: string;
  whyWorthwhile: string;
  learnAbout: { aLearns: string[]; bLearns: string[] };
  discoveryQuestions: string[];
  icpExchange: { a: string; b: string };
  triggers: string[];
  collaboration: string[];
  nextAction: string;
  followUpDate: string;
  exploratory: boolean;
}

export function meetingBrief(a: MemberProfile, b: MemberProfile, r: CompatibilityResult, now = new Date()): MeetingBrief {
  const icp = (m: MemberProfile) =>
    m.idealReferral?.trim() ||
    (m.customerSegments.length ? `${humanList(m.customerSegments, 3)}${m.companySizes.length ? ` (${humanList(m.companySizes, 2)})` : ""}${m.serviceAreas.length ? ` in ${humanList(m.serviceAreas, 2)}` : ""}` : `Not yet recorded — ask ${firstName(m)} to describe their ideal customer.`);
  const learn = (other: MemberProfile) => {
    const cat = getCategory(other.categoryId);
    return [
      `Who ${firstName(other)}'s best three customers are and why`,
      `What a perfect referral looks like for ${firstName(other)}${other.idealReferral ? ` (profile says: “${other.idealReferral}”)` : ""}`,
      cat ? `Which situations create urgent demand for a ${cat.name}` : `What ${firstName(other)} sells and to whom`,
      `How ${firstName(other)} prefers to receive introductions`,
    ];
  };
  const qs = [
    "Who are your three best customers, and how did you win them?",
    "What does a perfect referral look like for you — job title, company size, situation?",
    "What words would someone use that signal they need you?",
    "Which professionals already refer to you, and which ones do you wish did?",
    "What is one introduction I could make for you in the next 30 days?",
  ];
  const triggers = r.triggers.slice(0, 3).map((t) => `${t.situation} (${firstName(t.spotter === a.id ? a : b)} spots it for ${firstName(t.beneficiary === a.id ? a : b)})`);
  while (triggers.length < 3) {
    const fill = [r.referrals.aToB, r.referrals.bToA].flat()[triggers.length];
    if (!fill) break;
    triggers.push(fill.title);
  }
  const follow = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);
  return {
    memberAId: a.id,
    memberBId: b.id,
    score: r.score,
    label: r.label,
    whyWorthwhile: r.exploratory
      ? `Exploratory: profile data is limited. Use this meeting to complete each other's picture before passing referrals. ${r.summary}`
      : r.summary,
    learnAbout: { aLearns: learn(b), bLearns: learn(a) },
    discoveryQuestions: qs,
    icpExchange: { a: icp(a), b: icp(b) },
    triggers,
    collaboration: r.matches.collaborationIdeas.length ? r.matches.collaborationIdeas : ["Agree whether a joint offer or co-hosted session would serve your shared customers."],
    nextAction: r.isCompetitor
      ? "Agree what overflow or specialist work each of you will pass to the other."
      : `Each identify one named contact for the other within 7 days: ${firstName(a)} looks for “${r.referrals.aToB[0]?.title ?? "a qualified introduction"}”; ${firstName(b)} looks for “${r.referrals.bToA[0]?.title ?? "a qualified introduction"}”.`,
    followUpDate: follow,
    exploratory: r.exploratory,
  };
}

// ---- analytics helpers ------------------------------------------------------------

export function chapterProfileHealth(members: MemberProfile[]) {
  const list = active(members);
  const comp = list.map((m) => ({ m, c: profileCompleteness(m) }));
  return {
    activeMembers: list.length,
    averageCompleteness: list.length ? round((comp.reduce((s, x) => s + x.c.filled / x.c.total, 0) / list.length) * 100) : 0,
    incomplete: comp.filter((x) => x.c.filled <= 4).map((x) => ({ member: x.m, missing: x.c.missing })),
    unmappedCategories: list.filter((m) => !m.categoryId).map((m) => m.id),
  };
}

export { pairStats, TRIGGERS };
