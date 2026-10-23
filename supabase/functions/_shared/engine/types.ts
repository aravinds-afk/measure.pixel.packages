// Shared domain types for the ConnectSphere engine.
// This module is runtime-agnostic: it runs in the browser (demo mode), in Node (tests)
// and in Deno (Supabase Edge Functions). Keep it free of external imports.

/** Where a piece of member information came from. Never present ai_suggested data as fact. */
export type Provenance = "verified" | "member_submitted" | "ai_suggested";

export type Role = "admin" | "leadership" | "member";

export type RelationshipKind = "referral_partner" | "customer" | "vendor";

export interface MemberRelationship {
  memberId: string;
  kind: RelationshipKind;
  provenance: Provenance;
}

/** The subset of a member record used for scoring. Contact details and private values are excluded on purpose. */
export interface MemberProfile {
  id: string;
  chapterId: string;
  externalId?: string | null;
  fullName: string;
  photoUrl?: string | null;
  company?: string | null;
  /** Taxonomy category id, or null when the imported category could not be mapped. */
  categoryId?: string | null;
  /** The category text as supplied (shown when unmapped). */
  categoryLabel?: string | null;
  businessDescription?: string | null;
  services: string[];
  customerSegments: string[];
  companySizes: string[];
  industries: string[];
  serviceAreas: string[];
  problemsSolved: string[];
  keywords: string[];
  icpDescription?: string | null;
  /** Member-confirmed statement of the referral they want, e.g. "Owners of 20–100 person manufacturers". */
  idealReferral?: string | null;
  website?: string | null;
  relationships: MemberRelationship[];
  /** Chapter contact-sphere ids the member has been recorded in. */
  sphereIds: string[];
  status: "active" | "inactive";
  isDemo: boolean;
  source?: string | null;
  profileUpdatedAt?: string | null;
  /** Provenance per field name (e.g. { services: "verified", problemsSolved: "member_submitted" }). */
  fieldProvenance?: Record<string, Provenance>;
}

export type FactorKey =
  | "icp_overlap"
  | "complementary_services"
  | "referral_potential"
  | "contact_sphere"
  | "industry_overlap"
  | "geographic_alignment"
  | "shared_problems"
  | "relationship_potential";

export type Weights = Record<FactorKey, number>;

export interface ScoreBand {
  min: number;
  label: string;
}

export interface ChapterSettings {
  weights: Weights;
  bands: ScoreBand[];
}

export interface ReferralStat {
  giverId: string;
  receiverId: string;
  /** Referrals passed (any status from "introduction made" onwards). */
  count: number;
  closed: number;
}

export type EvidenceSource = "member_data" | "profession_knowledge" | "referral_history" | "chapter_data";

export interface Evidence {
  source: EvidenceSource;
  provenance?: Provenance;
  text: string;
}

export interface FactorResult {
  key: FactorKey;
  label: string;
  /** Configured weight, percent (0–100). */
  weight: number;
  /** Weight actually applied after excluding factors with missing data. */
  effectiveWeight: number;
  /** 0–100, or null when there was not enough data to evaluate it. */
  score: number | null;
  /** Points added to the total (score × effectiveWeight / 100). */
  contribution: number;
  reasons: string[];
  evidence: Evidence[];
}

export interface Adjustment {
  key: string;
  label: string;
  description: string;
  before: number;
  after: number;
}

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface Confidence {
  value: number; // 0–1
  level: ConfidenceLevel;
  missing: { memberA: string[]; memberB: string[] };
  note: string;
}

export type OpportunityConfidence = "High" | "Medium" | "Low" | "Exploratory";

export interface ReferralOpportunity {
  id: string;
  giverId: string;
  receiverId: string;
  type: string;
  title: string;
  relevance: string;
  lookFor: string[];
  triggerSituations: string[];
  triggerWords: string[];
  qualificationQuestions: string[];
  suggestedIntro: string;
  evidence: Evidence[];
  confidence: OpportunityConfidence;
}

export interface TriggerMatch {
  id: string;
  situation: string;
  spotter: string; // member id
  beneficiary: string; // member id
  words: string[];
  categories: string[]; // categories in the chapter that also respond to this trigger
}

export interface Scripts {
  fifteenSecond: string;
  oneToOne: string;
  whatsapp: string;
  testimonialRequest: string;
}

export interface CompatibilityResult {
  memberAId: string;
  memberBId: string;
  score: number;
  label: string;
  exploratory: boolean;
  confidence: Confidence;
  factors: FactorResult[];
  adjustments: Adjustment[];
  isCompetitor: boolean;
  sharedSpheres: string[];
  directional: { aToB: number; bToA: number };
  headline: string;
  summary: string;
  whyBullets: string[];
  matches: {
    sharedCustomers: string[];
    complementaryServices: string[];
    commonIndustries: string[];
    sharedMarkets: string[];
    problemsTogether: string[];
    collaborationIdeas: string[];
    gaps: string[];
  };
  referrals: { aToB: ReferralOpportunity[]; bToA: ReferralOpportunity[] };
  triggers: TriggerMatch[];
  scripts: { aAboutB: Scripts; bAboutA: Scripts };
  history: { aToB: number; bToA: number; closed: number; proven: boolean };
  weightsUsed: Weights;
  engineVersion: string;
  computedAt: string;
}
