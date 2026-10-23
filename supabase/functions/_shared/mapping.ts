// Maps database rows (member_profiles view) to engine profiles. Runtime-agnostic.

import type { MemberProfile, MemberRelationship, Provenance } from "./engine/types.ts";

export interface MemberProfileRow {
  id: string;
  chapter_id: string;
  user_id: string | null;
  external_id: string | null;
  full_name: string;
  photo_url: string | null;
  company: string | null;
  category_id: string | null;
  category_name: string | null;
  category_label: string | null;
  business_description: string | null;
  website: string | null;
  company_sizes: string[] | null;
  service_areas: string[] | null;
  problems_solved: string[] | null;
  keywords: string[] | null;
  icp_description: string | null;
  ideal_referral: string | null;
  field_provenance: Record<string, Provenance> | null;
  status: "active" | "inactive";
  is_demo: boolean;
  source: string | null;
  imported_at: string | null;
  profile_updated_at: string | null;
  services: string[] | null;
  customer_segments: string[] | null;
  industries: string[] | null;
  relationships: MemberRelationship[] | null;
  sphere_ids: string[] | null;
}

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
export const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** field_provenance is stored with snake_case column names; the engine uses camelCase field names. */
export function provenanceFromDb(p: Record<string, Provenance> | null | undefined): Record<string, Provenance> {
  const out: Record<string, Provenance> = {};
  for (const [k, v] of Object.entries(p ?? {})) out[camel(k)] = v;
  return out;
}

export function provenanceToDb(p: Record<string, Provenance>): Record<string, Provenance> {
  const out: Record<string, Provenance> = {};
  for (const [k, v] of Object.entries(p)) out[snake(k)] = v;
  return out;
}

export function rowToProfile(r: MemberProfileRow): MemberProfile {
  return {
    id: r.id,
    chapterId: r.chapter_id,
    externalId: r.external_id,
    fullName: r.full_name,
    photoUrl: r.photo_url,
    company: r.company,
    categoryId: r.category_id,
    categoryLabel: r.category_label ?? r.category_name,
    businessDescription: r.business_description,
    services: r.services ?? [],
    customerSegments: r.customer_segments ?? [],
    companySizes: r.company_sizes ?? [],
    industries: r.industries ?? [],
    serviceAreas: r.service_areas ?? [],
    problemsSolved: r.problems_solved ?? [],
    keywords: r.keywords ?? [],
    icpDescription: r.icp_description,
    idealReferral: r.ideal_referral,
    website: r.website,
    relationships: r.relationships ?? [],
    sphereIds: r.sphere_ids ?? [],
    status: r.status,
    isDemo: r.is_demo,
    source: r.source,
    profileUpdatedAt: r.profile_updated_at,
    fieldProvenance: provenanceFromDb(r.field_provenance),
  };
}

/** Columns on public.members that a profile editor may write (lists live in child tables). */
export function profileToMemberColumns(p: Partial<MemberProfile>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const map: [keyof MemberProfile, string][] = [
    ["fullName", "full_name"], ["photoUrl", "photo_url"], ["company", "company"], ["categoryId", "category_id"],
    ["categoryLabel", "category_label"], ["businessDescription", "business_description"], ["website", "website"],
    ["companySizes", "company_sizes"], ["serviceAreas", "service_areas"], ["problemsSolved", "problems_solved"],
    ["keywords", "keywords"], ["icpDescription", "icp_description"], ["idealReferral", "ideal_referral"],
  ];
  for (const [k, col] of map) if (k in p) out[col] = p[k] ?? null;
  for (const col of ["company_sizes", "service_areas", "problems_solved", "keywords"]) if (col in out && out[col] == null) out[col] = [];
  return out;
}
