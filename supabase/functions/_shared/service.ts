// Application service: the operations behind the API, independent of storage and runtime.
// The Edge Function loads ChapterData with the caller's own credentials (so RLS applies) and
// calls these; demo mode calls the same functions on in-browser fictional data.

import {
  analyseSpheres, bestMatches, chapterCategoryIds, chapterProfileHealth, computeCompatibility, findPartners,
  meetingBrief, memberSphereFit, missingCategories, nextReferrals, pairMatrix,
  type ChapterSettings, type CompatibilityResult, type ImportPlan, type MemberProfile, type ReferralStat, type MeetingBrief,
  DEFAULT_SETTINGS, validateWeights, humanList,
} from "./engine/index.ts";
import type { ImportRecord } from "./engine/importer.ts";

export interface ChapterData {
  chapter: { id: string; name: string; isDemo: boolean; settings: ChapterSettings };
  members: MemberProfile[];
  referralStats: ReferralStat[];
  suppressedKeys: string[];
}

export class ServiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function member(data: ChapterData, id: string): MemberProfile {
  const m = data.members.find((x) => x.id === id);
  if (!m) throw new ServiceError(404, "Member not found or not visible to you.");
  return m;
}

function opts(data: ChapterData) {
  return { settings: data.chapter.settings ?? DEFAULT_SETTINGS, referralStats: data.referralStats, chapterCategoryIds: chapterCategoryIds(data.members) };
}

function applySuppression(r: CompatibilityResult, suppressed: string[]): CompatibilityResult {
  if (!suppressed.length) return r;
  const keep = (list: CompatibilityResult["referrals"]["aToB"]) => list.filter((o) => !suppressed.includes(o.id));
  return { ...r, referrals: { aToB: keep(r.referrals.aToB), bToA: keep(r.referrals.bToA) } };
}

export function compatibilityReport(data: ChapterData, aId: string, bId: string): CompatibilityResult {
  if (aId === bId) throw new ServiceError(400, "Select two different members.");
  return applySuppression(computeCompatibility(member(data, aId), member(data, bId), opts(data)), data.suppressedKeys);
}

export function bestMatchesFor(data: ChapterData, meId: string, limit = 10) {
  return bestMatches(member(data, meId), data.members, opts(data), limit);
}

export function findPartnerIn(data: ChapterData, query: string, meId?: string) {
  if (!query.trim()) throw new ServiceError(400, "Describe a customer type or problem to search for.");
  return findPartners(query, data.members, meId);
}

export function nextReferralsFor(data: ChapterData, meId: string, limit = 8) {
  return nextReferrals(member(data, meId), data.members, opts(data), limit).filter((n) => !data.suppressedKeys.includes(n.opportunity.id));
}

export function contactSpheresFor(data: ChapterData, meId?: string) {
  const o = opts(data);
  const matrix = pairMatrix(data.members, o);
  const spheres = analyseSpheres(data.members, o, matrix);
  return {
    spheres,
    missing: missingCategories(data.members),
    myFit: meId && data.members.some((m) => m.id === meId) ? memberSphereFit(member(data, meId), spheres, matrix) : [],
  };
}

export function briefFor(data: ChapterData, aId: string, bId: string, now = new Date()): MeetingBrief {
  const r = compatibilityReport(data, aId, bId);
  return meetingBrief(member(data, aId), member(data, bId), r, now);
}

export function healthFor(data: ChapterData) {
  return chapterProfileHealth(data.members);
}

export function validateSettings(s: ChapterSettings) {
  const w = validateWeights(s.weights);
  const errors = [...w.errors];
  if (!Array.isArray(s.bands) || !s.bands.length) errors.push("At least one score band is required.");
  else {
    if (!s.bands.some((b) => b.min === 0)) errors.push("One score band must start at 0.");
    for (const b of s.bands) {
      if (!b.label?.trim()) errors.push("Every score band needs a label.");
      if (!(b.min >= 0 && b.min <= 100)) errors.push("Band thresholds must be between 0 and 100.");
    }
  }
  return { ok: errors.length === 0, errors };
}

// ---- import writes ---------------------------------------------------------------

export interface ImportOptions {
  /** Decisions for rows flagged as possible duplicates: merge into the matched member, create new, or skip. */
  duplicateDecisions?: Record<number, "merge" | "create" | "skip">;
  /** Overwrite fields the member has edited themselves. Default false: member edits win. */
  overwriteMemberSubmitted?: boolean;
  source?: "csv_import" | "excel_import";
}

export interface MemberWrite {
  kind: "create" | "update";
  rowNumber: number;
  memberId?: string;
  columns: Record<string, unknown>;
  services?: string[];
  segments?: string[];
  industries?: string[];
  contact?: { email: string | null; phone: string | null };
  avgTransactionValue?: number | null;
  /** Provenance to record, keyed by camelCase field name. */
  provenance: Record<string, "verified">;
}

// [import record field (also the camelCase provenance key), db column]
const COLUMN_FOR: [keyof ImportRecord, string][] = [
  ["externalId", "external_id"],
  ["fullName", "full_name"],
  ["company", "company"],
  ["categoryId", "category_id"],
  ["categoryLabel", "category_label"],
  ["businessDescription", "business_description"],
  ["website", "website"],
  ["photoUrl", "photo_url"],
  ["companySizes", "company_sizes"],
  ["serviceAreas", "service_areas"],
  ["problemsSolved", "problems_solved"],
  ["keywords", "keywords"],
  ["icpDescription", "icp_description"],
  ["idealReferral", "ideal_referral"],
];

const empty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Turn an import plan into concrete writes. Incremental: updates only touch fields present in the
 * file, and by default never overwrite what a member has edited on their own profile.
 */
export function planWrites(plan: ImportPlan, existing: MemberProfile[], options: ImportOptions = {}): { writes: MemberWrite[]; skipped: { rowNumber: number; reason: string }[] } {
  const writes: MemberWrite[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];
  for (const row of plan.rows) {
    let action = row.action;
    if (action === "possible_duplicate") {
      const d = options.duplicateDecisions?.[row.record.rowNumber] ?? "skip";
      if (d === "skip") { skipped.push({ rowNumber: row.record.rowNumber, reason: "Possible duplicate — not imported (no decision)." }); continue; }
      action = d === "merge" ? "update" : "create";
    }
    if (action === "skip" || action === "duplicate_in_file") {
      skipped.push({ rowNumber: row.record.rowNumber, reason: row.issues.map((i) => i.message).join(" ") || "Skipped." });
      continue;
    }
    const rec = row.record;
    const current = action === "update" ? existing.find((m) => m.id === row.matchedMemberId) : undefined;
    const columns: Record<string, unknown> = {};
    const provenance: Record<string, "verified"> = {};
    for (const [field, col] of COLUMN_FOR) {
      const v = rec[field];
      if (empty(v)) continue;
      if (current && !options.overwriteMemberSubmitted && current.fieldProvenance?.[field] === "member_submitted") continue;
      columns[col] = v;
      provenance[field] = "verified";
    }
    const keepList = (key: string, v: string[]) => !empty(v) && !(current && !options.overwriteMemberSubmitted && current.fieldProvenance?.[key] === "member_submitted");
    writes.push({
      kind: action === "update" ? "update" : "create",
      rowNumber: rec.rowNumber,
      memberId: action === "update" ? row.matchedMemberId : undefined,
      columns,
      services: keepList("services", rec.services) ? rec.services : undefined,
      segments: keepList("customerSegments", rec.customerSegments) ? rec.customerSegments : undefined,
      industries: keepList("industries", rec.industries) ? rec.industries : undefined,
      contact: rec.email || rec.phone ? { email: rec.email, phone: rec.phone } : undefined,
      avgTransactionValue: rec.avgTransactionValue,
      provenance,
    });
  }
  return { writes, skipped };
}

// ---- LLM explanation ---------------------------------------------------------------

/**
 * Build the minimal, de-identified payload sent to the language model. No contact details, names,
 * companies or values: only categories and the deterministic findings. Names are substituted afterwards.
 */
export function explanationPayload(r: CompatibilityResult, a: MemberProfile, b: MemberProfile) {
  return {
    memberA: { label: "Member A", category: a.categoryLabel ?? a.categoryId ?? "Unknown" },
    memberB: { label: "Member B", category: b.categoryLabel ?? b.categoryId ?? "Unknown" },
    score: r.score,
    band: r.label,
    confidence: r.confidence.level,
    competitor: r.isCompetitor,
    provenHistory: r.history.proven,
    factors: r.factors.map((f) => ({ factor: f.label, score: f.score, reasons: f.reasons.map((x) => deidentify(x, a, b)) })),
    sharedCustomers: r.matches.sharedCustomers,
    referralIdeas: [...r.referrals.aToB.map((o) => `A→B: ${o.title}`), ...r.referrals.bToA.map((o) => `B→A: ${o.title}`)].slice(0, 6),
  };
}

function firstOf(m: MemberProfile) {
  return m.fullName.trim().split(/\s+/)[0];
}

function deidentify(text: string, a: MemberProfile, b: MemberProfile): string {
  let t = text;
  for (const [m, label] of [[a, "Member A"], [b, "Member B"]] as const) {
    for (const n of [m.fullName, firstOf(m), m.company].filter((x): x is string => !!x)) t = t.split(n).join(label);
  }
  return t;
}

export function reidentify(text: string, a: MemberProfile, b: MemberProfile): string {
  return text.split("Member A").join(firstOf(a)).split("Member B").join(firstOf(b));
}

export const EXPLANATION_SYSTEM_PROMPT = `You write short explanations of BNI-style referral compatibility reports for chapter members.
Use only the facts in the JSON you are given. Do not invent credentials, customers, relationships, testimonials, referral history or outcomes.
Refer to the members only as "Member A" and "Member B". If confidence is Low, say the assessment is exploratory and that profiles need completing.
If "provenHistory" is false, describe the relationship as potential, not proven. Never promise business results.
Write 3–4 plain sentences, no headings, no bullet points.`;

export function fallbackExplanation(r: CompatibilityResult): string {
  return `${r.summary} ${r.whyBullets.slice(0, 2).join(" ")}`;
}

export { humanList };
