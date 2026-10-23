// CSV / Excel member import: column mapping, validation and duplicate detection.
// Pure functions; the server re-runs validation before writing anything.

import { clean, splitList } from "./normalize.ts";
import { matchCategory } from "./taxonomy.ts";

export interface ImportRecord {
  rowNumber: number;
  externalId: string | null;
  fullName: string;
  company: string | null;
  categoryLabel: string | null;
  categoryId: string | null;
  chapterName: string | null;
  region: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  photoUrl: string | null;
  businessDescription: string | null;
  services: string[];
  customerSegments: string[];
  companySizes: string[];
  industries: string[];
  serviceAreas: string[];
  problemsSolved: string[];
  keywords: string[];
  icpDescription: string | null;
  idealReferral: string | null;
  avgTransactionValue: number | null;
}

export type FieldKey = Exclude<keyof ImportRecord, "rowNumber" | "categoryId">;

/** Header aliases (lowercased, punctuation-stripped). Covers common BNI Connect export headers. */
export const COLUMN_ALIASES: Record<FieldKey | "firstName" | "lastName", string[]> = {
  externalId: ["member id", "bni member id", "memberid", "id", "bni id", "membership id", "member number"],
  fullName: ["name", "full name", "member name", "member", "display name"],
  firstName: ["first name", "firstname", "given name"],
  lastName: ["last name", "lastname", "surname", "family name"],
  company: ["company", "company name", "business name", "business", "organisation", "organization", "firm"],
  categoryLabel: ["category", "professional category", "profession", "classification", "speciality", "specialty", "business category", "primary category", "profession specialty", "profession/specialty", "category specialty"],
  chapterName: ["chapter", "chapter name", "bni chapter"],
  region: ["region", "bni region", "area"],
  email: ["email", "email address", "e-mail", "mail"],
  phone: ["phone", "mobile", "phone number", "mobile number", "contact number", "telephone", "cell"],
  website: ["website", "web", "url", "website url", "company website"],
  photoUrl: ["photo", "photo url", "profile photo", "image", "picture"],
  businessDescription: ["business description", "description", "about", "bio", "company description", "my business", "about my business"],
  services: ["services", "products and services", "products & services", "products", "offerings", "what i do", "top product", "top products", "main products"],
  customerSegments: ["ideal customer", "ideal customers", "target market", "customer types", "customer type", "ideal customer profile", "icp", "who i serve", "target customers"],
  companySizes: ["company size", "target company size", "customer size", "client size"],
  industries: ["industries", "industries served", "industry", "sectors", "verticals"],
  serviceAreas: ["service area", "service areas", "location", "city", "geography", "geographic service area", "territory", "locations served", "business city", "areas served"],
  problemsSolved: ["problems solved", "customer problems", "problems", "pain points", "typical problems", "challenges solved", "top problem solved", "top problems solved"],
  keywords: ["keywords", "tags", "key words", "search keywords"],
  icpDescription: ["icp description", "ideal customer description", "target market description"],
  idealReferral: ["ideal referral", "my ideal referral", "good referral", "referral wanted"],
  avgTransactionValue: ["average transaction value", "avg transaction value", "average project value", "avg deal size", "transaction value"],
};

const LIST_FIELDS: FieldKey[] = ["services", "customerSegments", "companySizes", "industries", "serviceAreas", "problemsSolved", "keywords"];

const aliasIndex = (() => {
  const m = new Map<string, string>();
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    m.set(clean(field), field);
    for (const a of aliases) m.set(clean(a), field);
  }
  return m;
})();

/** Suggest a field for each header; unknown headers map to null (ignored). */
export function suggestMapping(headers: string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const h of headers) out[h] = aliasIndex.get(clean(h)) ?? null;
  return out;
}

export interface RowIssue {
  rowNumber: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export function normalizeRow(raw: Record<string, unknown>, mapping: Record<string, string | null>, rowNumber: number): { record: ImportRecord; issues: RowIssue[] } {
  const issues: RowIssue[] = [];
  const pick: Record<string, unknown[]> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue;
    (pick[field] ??= []).push(raw[header]);
  }
  const one = (f: string) => str(pick[f]?.find((v) => str(v) != null));
  const list = (f: string) => [...new Set((pick[f] ?? []).flatMap(splitList))];

  let fullName = one("fullName");
  if (!fullName) {
    const parts = [one("firstName"), one("lastName")].filter(Boolean);
    fullName = parts.length ? parts.join(" ") : null;
  }
  // Several columns may hold the category (e.g. "Profession" and "Specialty"); use the most specific one that maps.
  const catValues = (pick.categoryLabel ?? []).map(str).filter((v): v is string => !!v);
  const mapped = [...catValues].reverse().find((v) => matchCategory(v));
  const categoryLabel = mapped ?? (catValues.length ? catValues[catValues.length - 1] : null);
  const categoryId = matchCategory(mapped ?? catValues.join(" "));
  let email = one("email")?.toLowerCase() ?? null;
  let website = one("website");
  let phone = one("phone");
  const valueRaw = one("avgTransactionValue");
  let avg: number | null = null;

  if (!fullName) issues.push({ rowNumber, field: "fullName", message: "Missing member name — row skipped.", severity: "error" });
  if (!categoryLabel) issues.push({ rowNumber, field: "categoryLabel", message: "Missing professional category.", severity: "warning" });
  else if (!categoryId) issues.push({ rowNumber, field: "categoryLabel", message: `Category “${categoryLabel}” is not in the profession taxonomy; it will be stored as a custom category with lower scoring confidence.`, severity: "warning" });
  if (email && !EMAIL_RE.test(email)) {
    issues.push({ rowNumber, field: "email", message: `Invalid email “${email}” — not imported.`, severity: "warning" });
    email = null;
  }
  if (phone) {
    const digits = phone.replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length < 7) {
      issues.push({ rowNumber, field: "phone", message: `Phone “${phone}” looks invalid — not imported.`, severity: "warning" });
      phone = null;
    } else phone = digits;
  }
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try {
      new URL(website);
    } catch {
      issues.push({ rowNumber, field: "website", message: `Website “${website}” is not a valid URL — not imported.`, severity: "warning" });
      website = null;
    }
  }
  if (valueRaw) {
    const n = Number(valueRaw.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n >= 0) avg = n;
    else issues.push({ rowNumber, field: "avgTransactionValue", message: "Average transaction value is not a number — ignored.", severity: "warning" });
  }
  const photo = one("photoUrl");
  const record: ImportRecord = {
    rowNumber,
    externalId: one("externalId"),
    fullName: fullName ?? "",
    company: one("company"),
    categoryLabel,
    categoryId,
    chapterName: one("chapterName"),
    region: one("region"),
    email,
    phone,
    website,
    photoUrl: photo && /^https:\/\//i.test(photo) ? photo : null,
    businessDescription: one("businessDescription"),
    services: list("services"),
    customerSegments: list("customerSegments"),
    companySizes: list("companySizes"),
    industries: list("industries"),
    serviceAreas: list("serviceAreas"),
    problemsSolved: list("problemsSolved"),
    keywords: list("keywords"),
    icpDescription: one("icpDescription"),
    idealReferral: one("idealReferral"),
    avgTransactionValue: avg,
  };
  return { record, issues };
}

/** Stable key for matching people without an id or email: normalised name + company. */
export function nameKey(fullName: string, company: string | null | undefined): string {
  return `${clean(fullName).replace(/\s+/g, " ")}|${clean(company ?? "")}`;
}

export interface ExistingMemberKey {
  id: string;
  externalId?: string | null;
  email?: string | null;
  fullName: string;
  company?: string | null;
}

export type PlanAction = "create" | "update" | "duplicate_in_file" | "possible_duplicate" | "skip";

export interface PlanRow {
  record: ImportRecord;
  action: PlanAction;
  matchedMemberId?: string;
  matchedOn?: "external_id" | "email" | "name_company";
  issues: RowIssue[];
}

export interface ImportPlan {
  rows: PlanRow[];
  totals: { rows: number; create: number; update: number; duplicates: number; possibleDuplicates: number; errors: number; warnings: number };
  missingFields: Record<string, number>;
  unmappedHeaders: string[];
}

const TRACKED: FieldKey[] = ["externalId", "company", "categoryLabel", "email", "phone", "website", "businessDescription", "services", "customerSegments", "industries", "serviceAreas", "problemsSolved", "keywords"];

export function buildImportPlan(rows: Record<string, unknown>[], mapping: Record<string, string | null>, existing: ExistingMemberKey[]): ImportPlan {
  const byExt = new Map(existing.filter((e) => e.externalId).map((e) => [String(e.externalId).trim().toLowerCase(), e]));
  const byEmail = new Map(existing.filter((e) => e.email).map((e) => [e.email!.toLowerCase(), e]));
  const byName = new Map(existing.map((e) => [nameKey(e.fullName, e.company), e]));
  const seen = new Map<string, number>();
  const planned: PlanRow[] = [];
  const missingFields: Record<string, number> = {};

  rows.forEach((raw, i) => {
    const rowNumber = i + 2; // header is row 1
    const { record, issues } = normalizeRow(raw, mapping, rowNumber);
    if (issues.some((x) => x.severity === "error")) {
      planned.push({ record, action: "skip", issues });
      return;
    }
    for (const f of TRACKED) {
      const v = record[f];
      if (v == null || (Array.isArray(v) && !v.length)) missingFields[f] = (missingFields[f] ?? 0) + 1;
    }
    const keys = [
      record.externalId ? `ext:${record.externalId.toLowerCase()}` : null,
      record.email ? `email:${record.email}` : null,
      `name:${nameKey(record.fullName, record.company)}`,
    ].filter((k): k is string => !!k);
    const dupOf = keys.map((k) => seen.get(k)).find((v) => v != null);
    if (dupOf != null) {
      planned.push({ record, action: "duplicate_in_file", issues: [...issues, { rowNumber, message: `Duplicate of row ${dupOf} in this file — skipped.`, severity: "warning" }] });
      return;
    }
    keys.forEach((k) => seen.set(k, rowNumber));

    const ext = record.externalId ? byExt.get(record.externalId.toLowerCase()) : undefined;
    const em = record.email ? byEmail.get(record.email) : undefined;
    const nm = byName.get(nameKey(record.fullName, record.company));
    if (ext) planned.push({ record, action: "update", matchedMemberId: ext.id, matchedOn: "external_id", issues });
    else if (em) planned.push({ record, action: "update", matchedMemberId: em.id, matchedOn: "email", issues });
    else if (nm) planned.push({ record, action: "possible_duplicate", matchedMemberId: nm.id, matchedOn: "name_company", issues: [...issues, { rowNumber, message: `Same name and company as an existing member but no matching member ID or email. Review before merging.`, severity: "warning" }] });
    else planned.push({ record, action: "create", issues });
  });

  const totals = {
    rows: rows.length,
    create: planned.filter((p) => p.action === "create").length,
    update: planned.filter((p) => p.action === "update").length,
    duplicates: planned.filter((p) => p.action === "duplicate_in_file").length,
    possibleDuplicates: planned.filter((p) => p.action === "possible_duplicate").length,
    errors: planned.filter((p) => p.action === "skip").length,
    warnings: planned.reduce((s, p) => s + p.issues.filter((x) => x.severity === "warning").length, 0),
  };
  const unmappedHeaders = Object.entries(mapping).filter(([, f]) => !f).map(([h]) => h);
  return { rows: planned, totals, missingFields, unmappedHeaders };
}

export { LIST_FIELDS };
