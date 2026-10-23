import type {
  ChapterSettings, CompatibilityResult, ImportPlan, MatchSummary, MeetingBrief, MemberProfile, NextReferral, PartnerHit,
  Role, SphereAnalysis, MissingCategory,
} from "@engine/index.ts";
import type { ImportOptions } from "@shared/service.ts";

export type { Role };

export interface Session {
  userId: string;
  email: string;
  role: Role;
  memberId: string | null;
  chapterId: string;
  chapterName: string;
  isDemo: boolean;
}

export type ConnectionStatus =
  | "recommended" | "one_to_one_scheduled" | "one_to_one_completed" | "referral_opportunity_identified"
  | "introduction_made" | "referral_accepted" | "business_meeting_completed" | "business_closed" | "not_suitable";

export const CONNECTION_STATUSES: { value: ConnectionStatus; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "one_to_one_scheduled", label: "One-to-one scheduled" },
  { value: "one_to_one_completed", label: "One-to-one completed" },
  { value: "referral_opportunity_identified", label: "Referral opportunity identified" },
  { value: "introduction_made", label: "Introduction made" },
  { value: "referral_accepted", label: "Referral accepted" },
  { value: "business_meeting_completed", label: "Business meeting completed" },
  { value: "business_closed", label: "Business closed" },
  { value: "not_suitable", label: "Not a suitable match" },
];

export type ReferralStatus = Exclude<ConnectionStatus, "recommended" | "one_to_one_scheduled" | "one_to_one_completed">;
export const REFERRAL_STATUSES = CONNECTION_STATUSES.filter((s) => !["recommended", "one_to_one_scheduled", "one_to_one_completed"].includes(s.value)) as { value: ReferralStatus; label: string }[];

export interface MemberContact {
  email: string | null;
  phone: string | null;
  visibility: "chapter" | "private";
}

export interface MemberPrivate {
  avgTransactionValue: number | null;
  shareWithLeadership: boolean;
}

export type ProfilePatch = Partial<Pick<MemberProfile,
  "fullName" | "photoUrl" | "company" | "categoryId" | "categoryLabel" | "businessDescription" | "website" | "services" |
  "customerSegments" | "companySizes" | "industries" | "serviceAreas" | "problemsSolved" | "keywords" | "icpDescription" | "idealReferral">>;

export interface SavedConnection {
  id: string;
  ownerMemberId: string;
  targetMemberId: string;
  status: ConnectionStatus;
  score: number | null;
  notes: string | null;
  scripts: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
  events: { from: ConnectionStatus | null; to: ConnectionStatus; at: string }[];
}

export interface Meeting {
  id: string;
  memberA: string;
  memberB: string;
  scheduledFor: string | null;
  status: "planned" | "scheduled" | "completed" | "cancelled";
  brief: MeetingBrief | null;
  agreedNextAction: string | null;
  followUpDate: string | null;
  outcomeNotes: string | null;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  giverId: string;
  receiverId: string;
  status: ReferralStatus;
  description: string | null;
  businessValue: number | null;
  createdAt: string;
}

export interface Feedback {
  id: string;
  key: string;
  giverId: string | null;
  receiverId: string | null;
  verdict: "useful" | "inaccurate";
  note: string | null;
  userId: string;
  resolution: string | null;
  createdAt: string;
}

export interface ImportJob {
  id: string;
  filename: string | null;
  status: string;
  totals: Record<string, number>;
  issues: { rowNumber?: number; message: string; severity: string }[];
  createdAt: string;
}

export interface ImportCommitResult {
  jobId: string;
  totals: Record<string, number>;
  skipped: { rowNumber: number; reason: string }[];
  failures: { rowNumber: number; message: string }[];
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  operation: string;
  changes: Record<string, unknown>;
  changedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  memberId: string | null;
  status: string;
  createdAt: string;
}

export interface MemberAccess {
  memberId: string;
  userId: string | null;
  role: Role | null;
}

export interface Analytics {
  activeMembers: number;
  introductions: number;
  accepted: number;
  closed: number;
  businessGenerated: number;
  meetingsCompleted: number;
  meetingsPlanned: number;
  savedConnections: number;
  feedbackUseful: number;
  feedbackInaccurate: number;
  topPartnerships: { a: string; b: string; referrals: number }[];
  participation: { member_id: string; given: number; received: number; meetings: number }[];
}

export interface SpheresResult {
  spheres: SphereAnalysis[];
  missing: MissingCategory[];
  myFit: { sphereId: string; name: string; fit: number | null; inTemplate: boolean }[];
}

export interface ProfileHealth {
  activeMembers: number;
  averageCompleteness: number;
  incomplete: { member: MemberProfile; missing: string[] }[];
  unmappedCategories: string[];
}

export interface Backend {
  mode: "demo" | "live";
  getSession(): Promise<Session | null>;
  onAuthChange(cb: () => void): () => void;
  signInWithPassword(email: string, password: string): Promise<void>;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Live mode only: set or change the signed-in user's password. */
  setPassword?(password: string): Promise<void>;
  /** Browser-only modes: fictional demo or the user's private chapter workspace. */
  workspace?: "demo" | "private";
  /** Private workspace only: link the signed-in user to their own member record. */
  linkMyMember?(memberId: string | null): Promise<void>;
  renameChapter?(name: string): Promise<void>;
  /** Demo mode only. */
  demoPersonas?: { userId: string; label: string; role: Role }[];
  demoSignIn?(userId: string): Promise<void>;
  demoReset?(): Promise<void>;

  listMembers(): Promise<MemberProfile[]>;
  getContact(memberId: string): Promise<MemberContact | null>;
  updateContact(memberId: string, c: MemberContact): Promise<void>;
  getPrivate(memberId: string): Promise<MemberPrivate | null>;
  updatePrivate(memberId: string, p: MemberPrivate): Promise<void>;
  updateProfile(memberId: string, patch: ProfilePatch): Promise<void>;
  memberHistory(memberId: string): Promise<HistoryEntry[]>;

  compatibility(a: string, b: string): Promise<CompatibilityResult>;
  explain(a: string, b: string): Promise<{ text: string; source: "ai" | "deterministic" }>;
  bestMatches(memberId: string, limit?: number): Promise<MatchSummary[]>;
  findPartner(query: string, memberId?: string): Promise<PartnerHit[]>;
  nextReferrals(memberId: string): Promise<NextReferral[]>;
  contactSpheres(memberId?: string): Promise<SpheresResult>;
  brief(a: string, b: string): Promise<MeetingBrief>;
  health(): Promise<ProfileHealth>;

  listSaved(): Promise<SavedConnection[]>;
  saveConnection(targetMemberId: string, score: number | null): Promise<SavedConnection>;
  updateConnection(id: string, patch: Partial<Pick<SavedConnection, "status" | "notes" | "scripts">>): Promise<void>;
  removeConnection(id: string): Promise<void>;

  listMeetings(): Promise<Meeting[]>;
  createMeeting(m: Omit<Meeting, "id" | "createdAt">): Promise<Meeting>;
  updateMeeting(id: string, patch: Partial<Omit<Meeting, "id" | "createdAt" | "memberA" | "memberB">>): Promise<void>;

  listReferrals(): Promise<ReferralRecord[]>;
  recordReferral(r: Omit<ReferralRecord, "id" | "createdAt"> & { consentConfirmed: boolean }): Promise<void>;
  updateReferral(id: string, patch: Partial<Pick<ReferralRecord, "status" | "businessValue" | "description">>): Promise<void>;

  myFeedback(): Promise<Feedback[]>;
  giveFeedback(key: string, giverId: string, receiverId: string, verdict: "useful" | "inaccurate", note?: string): Promise<void>;

  analytics(): Promise<Analytics>;
  allFeedback(): Promise<Feedback[]>;
  resolveFeedback(id: string, resolution: string, suppress: boolean): Promise<void>;
  suppressedKeys(): Promise<string[]>;
  unsuppress(key: string): Promise<void>;

  getSettings(): Promise<ChapterSettings>;
  saveSettings(s: ChapterSettings): Promise<void>;
  importPreview(rows: Record<string, unknown>[], mapping: Record<string, string | null>): Promise<ImportPlan>;
  importCommit(rows: Record<string, unknown>[], mapping: Record<string, string | null>, filename: string, options: ImportOptions): Promise<ImportCommitResult>;
  listImportJobs(): Promise<ImportJob[]>;
  createMember(p: ProfilePatch & { fullName: string; externalId?: string | null }, contact?: Partial<MemberContact>): Promise<string>;
  invite(email: string, role: Role, memberId: string | null): Promise<{ note?: string }>;
  listInvitations(): Promise<Invitation[]>;
  revokeInvitation(id: string): Promise<void>;
  memberAccess(): Promise<MemberAccess[]>;
  setRole(userId: string, role: Role): Promise<void>;
  deactivate(memberId: string, reason: string): Promise<void>;
  reactivate(memberId: string): Promise<void>;
  erase(memberId: string): Promise<void>;
  auditLog(): Promise<AuditEntry[]>;
  setSphereMembership(memberId: string, sphereKey: string, member: boolean): Promise<void>;
}
