// DEMO MODE backend: fictional data held in this browser only. Implements the same Backend contract
// as the Supabase backend and runs the same scoring service, so every workflow can be tried end to end.

import { buildImportPlan, DEFAULT_SETTINGS, type ChapterSettings, type MemberProfile, type ReferralStat } from "@engine/index.ts";
import { DEMO_CHAPTER, DEMO_MEMBERS, DEMO_REFERRALS, DEMO_USERS } from "@shared/demo-data.ts";
import * as svc from "@shared/service.ts";
import type {
  Analytics, AuditEntry, Backend, Feedback, HistoryEntry, ImportJob, Invitation, MemberContact, MemberPrivate, Meeting,
  ProfilePatch, ReferralRecord, Role, SavedConnection, Session,
} from "./types.ts";

export type LocalWorkspace = "demo" | "private";

/** Private workspace: the user's real chapter, held only in this browser, never mixed with fictional data. */
export const PRIVATE_CHAPTER = { id: "00000000-0000-4000-8000-0000000c0001", name: "My Chapter (private workspace)", isDemo: false };
const PRIVATE_USER = { userId: "private-user", label: "You — chapter admin (this browser only)", role: "admin" as const };

interface DemoState {
  chapterName: string;
  members: MemberProfile[];
  contacts: Record<string, MemberContact>;
  priv: Record<string, MemberPrivate>;
  saved: SavedConnection[];
  meetings: Meeting[];
  referrals: ReferralRecord[];
  feedback: Feedback[];
  suppressed: { key: string; reason: string }[];
  settings: ChapterSettings;
  importJobs: ImportJob[];
  invitations: Invitation[];
  roles: Record<string, { role: Role; memberId: string | null; email: string }>;
  audit: AuditEntry[];
  history: Record<string, HistoryEntry[]>;
}

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);
const now = () => new Date().toISOString();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function initialState(kind: LocalWorkspace): DemoState {
  if (kind === "private") {
    return {
      chapterName: PRIVATE_CHAPTER.name, members: [], contacts: {}, priv: {}, saved: [], meetings: [], referrals: [], feedback: [], suppressed: [],
      settings: clone(DEFAULT_SETTINGS), importJobs: [], invitations: [], audit: [], history: {},
      roles: { [PRIVATE_USER.userId]: { role: PRIVATE_USER.role, memberId: null, email: "This browser" } },
    };
  }
  const members = clone(DEMO_MEMBERS).map(({ email: _e, phone: _p, contactVisibility: _v, ...m }) => m as MemberProfile);
  const contacts: Record<string, MemberContact> = {};
  for (const m of DEMO_MEMBERS) if (m.email || m.phone) contacts[m.id] = { email: m.email ?? null, phone: m.phone ?? null, visibility: m.contactVisibility };
  const roles: DemoState["roles"] = {};
  for (const u of DEMO_USERS) roles[u.userId] = { role: u.role, memberId: u.memberId, email: u.email };
  const created = "2026-09-15T10:00:00.000Z";
  return {
    chapterName: DEMO_CHAPTER.name,
    members,
    contacts,
    priv: {},
    saved: [],
    meetings: [],
    referrals: DEMO_REFERRALS.map((r) => ({ id: uid(), giverId: r.giverId, receiverId: r.receiverId, status: r.status, description: r.description, businessValue: r.value, createdAt: created })),
    feedback: [],
    suppressed: [],
    settings: clone(DEFAULT_SETTINGS),
    importJobs: [],
    invitations: [],
    roles,
    audit: [],
    history: {},
  };
}

function load(kind: LocalWorkspace, key: string): DemoState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw) as DemoState;
      return { ...saved, chapterName: saved.chapterName ?? (kind === "private" ? PRIVATE_CHAPTER.name : DEMO_CHAPTER.name) };
    }
  } catch {
    /* storage unavailable: fall back to a fresh in-memory state */
  }
  return initialState(kind);
}

export function createDemoBackend(kind: LocalWorkspace = "demo"): Backend {
  const KEY = kind === "private" ? "connectsphere-private-v1" : "connectsphere-demo-v1";
  const SESSION_KEY = kind === "private" ? "connectsphere-private-session" : "connectsphere-demo-session";
  const CHAPTER = kind === "private" ? PRIVATE_CHAPTER : DEMO_CHAPTER;
  const isDemo = kind === "demo";
  let state = load(kind, KEY);
  let sessionUser: string | null = null;
  try {
    sessionUser = localStorage.getItem(SESSION_KEY);
  } catch {
    sessionUser = null;
  }
  const listeners = new Set<() => void>();
  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  };
  const notify = () => listeners.forEach((l) => l());

  const me = () => {
    if (!sessionUser || !state.roles[sessionUser]) throw new Error("Sign in required.");
    return { userId: sessionUser, ...state.roles[sessionUser] };
  };
  const isLeader = () => ["admin", "leadership"].includes(me().role);
  const requireAdmin = () => {
    if (me().role !== "admin") throw new Error("Chapter admin access required.");
  };
  const requireLeader = () => {
    if (!isLeader()) throw new Error("Leadership access required.");
  };
  const myMember = () => {
    const m = me().memberId;
    if (!m) throw new Error("Your account is not linked to a member profile.");
    return m;
  };
  const visibleMembers = () => state.members.filter((m) => m.status === "active" || isLeader() || m.id === me().memberId);
  const audit = (action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) => {
    state.audit.unshift({ id: uid(), action, entity, entityId, details: { ...details, actor: me().email }, createdAt: now() });
  };
  const history = (memberId: string, operation: string, changes: Record<string, unknown>) => {
    (state.history[memberId] ??= []).unshift({ id: uid(), operation, changes, changedAt: now() });
  };
  const stats = (): ReferralStat[] => {
    const map = new Map<string, ReferralStat>();
    for (const r of state.referrals) {
      if (r.status === "referral_opportunity_identified") continue;
      const k = `${r.giverId}|${r.receiverId}`;
      const s = map.get(k) ?? { giverId: r.giverId, receiverId: r.receiverId, count: 0, closed: 0 };
      s.count++;
      if (r.status === "business_closed") s.closed++;
      map.set(k, s);
    }
    return [...map.values()];
  };
  const data = (): svc.ChapterData => ({
    chapter: { id: CHAPTER.id, name: state.chapterName, isDemo, settings: state.settings },
    members: visibleMembers(),
    referralStats: stats(),
    suppressedKeys: state.suppressed.map((s) => s.key),
  });
  const commit = <T,>(v: T): T => {
    persist();
    notify();
    return v;
  };
  const wrap = async <T,>(fn: () => T): Promise<T> => {
    try {
      return fn();
    } catch (e) {
      if (e instanceof svc.ServiceError) throw new Error(e.message);
      throw e;
    }
  };
  const canEdit = (memberId: string) => me().role === "admin" || me().memberId === memberId;

  const backend: Backend = {
    mode: "demo",
    workspace: kind,
    demoPersonas: kind === "private" ? [PRIVATE_USER] : DEMO_USERS.map((u) => ({ userId: u.userId, label: u.label, role: u.role })),
    async linkMyMember(memberId) {
      requireAdmin();
      if (memberId && !state.members.some((m) => m.id === memberId)) throw new Error("Member not found.");
      for (const r of Object.values(state.roles)) if (r.memberId === memberId && memberId) r.memberId = null;
      state.roles[me().userId].memberId = memberId;
      commit(null);
    },
    async renameChapter(name) {
      requireAdmin();
      if (!name.trim()) throw new Error("Chapter name is required.");
      state.chapterName = name.trim();
      commit(null);
    },
    async demoSignIn(userId) {
      sessionUser = userId;
      try {
        localStorage.setItem(SESSION_KEY, userId);
      } catch {
        /* ignore */
      }
      notify();
    },
    async demoReset() {
      state = initialState(kind);
      persist();
      notify();
    },
    async getSession(): Promise<Session | null> {
      if (!sessionUser || !state.roles[sessionUser]) return null;
      const r = state.roles[sessionUser];
      return { userId: sessionUser, email: r.email, role: r.role, memberId: r.memberId, chapterId: CHAPTER.id, chapterName: state.chapterName, isDemo };
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signInWithPassword() {
      throw new Error("Demo mode: choose a demo persona below.");
    },
    async sendMagicLink() {
      throw new Error("Demo mode: choose a demo persona below.");
    },
    async signOut() {
      sessionUser = null;
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
      notify();
    },

    async listMembers() {
      return clone(visibleMembers());
    },
    async getContact(memberId) {
      const c = state.contacts[memberId];
      if (!c) return null;
      if (c.visibility === "private" && !canEdit(memberId)) return null;
      return { ...c };
    },
    async updateContact(memberId, c) {
      if (!canEdit(memberId)) throw new Error("You can only edit your own contact details.");
      state.contacts[memberId] = { ...c };
      audit("member_contacts.update", "member_contacts", memberId, { visibility: c.visibility });
      commit(null);
    },
    async getPrivate(memberId) {
      const p = state.priv[memberId];
      if (!p) return canEdit(memberId) ? { avgTransactionValue: null, shareWithLeadership: false } : null;
      if (canEdit(memberId) || (p.shareWithLeadership && isLeader())) return { ...p };
      return null;
    },
    async updatePrivate(memberId, p) {
      if (!canEdit(memberId)) throw new Error("You can only edit your own confidential details.");
      state.priv[memberId] = { ...p };
      commit(null);
    },
    async updateProfile(memberId, patch) {
      if (!canEdit(memberId)) throw new Error("You can only edit your own profile.");
      const m = state.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found.");
      const changes: Record<string, unknown> = {};
      const prov = { ...(m.fieldProvenance ?? {}) };
      for (const [k, v] of Object.entries(patch) as [keyof ProfilePatch, unknown][]) {
        if (JSON.stringify((m as unknown as Record<string, unknown>)[k]) === JSON.stringify(v)) continue;
        changes[k] = { from: (m as unknown as Record<string, unknown>)[k], to: v };
        (m as unknown as Record<string, unknown>)[k] = v;
        if (me().role !== "admin" || me().memberId === memberId) prov[k] = "member_submitted";
        else prov[k] = "verified";
      }
      m.fieldProvenance = prov;
      m.profileUpdatedAt = now();
      if (Object.keys(changes).length) history(memberId, "update", changes);
      commit(null);
    },
    async memberHistory(memberId) {
      if (!canEdit(memberId)) return [];
      return clone(state.history[memberId] ?? []);
    },

    compatibility: (a, b) => wrap(() => svc.compatibilityReport(data(), a, b)),
    explain: (a, b) => wrap(() => ({ text: svc.fallbackExplanation(svc.compatibilityReport(data(), a, b)), source: "deterministic" as const })),
    bestMatches: (memberId, limit) => wrap(() => svc.bestMatchesFor(data(), memberId, limit)),
    findPartner: (query, memberId) => wrap(() => svc.findPartnerIn(data(), query, memberId)),
    nextReferrals: (memberId) => wrap(() => svc.nextReferralsFor(data(), memberId)),
    contactSpheres: (memberId) => wrap(() => svc.contactSpheresFor(data(), memberId)),
    brief: (a, b) => wrap(() => svc.briefFor(data(), a, b)),
    health: () => wrap(() => svc.healthFor(data())),

    async listSaved() {
      const mine = me().memberId;
      return clone(state.saved.filter((s) => s.ownerMemberId === mine));
    },
    async saveConnection(target, score) {
      const owner = myMember();
      const existing = state.saved.find((s) => s.ownerMemberId === owner && s.targetMemberId === target);
      if (existing) return clone(existing);
      const s: SavedConnection = { id: uid(), ownerMemberId: owner, targetMemberId: target, status: "recommended", score, notes: null, scripts: null, createdAt: now(), updatedAt: now(), events: [{ from: null, to: "recommended", at: now() }] };
      state.saved.push(s);
      return commit(clone(s));
    },
    async updateConnection(id, patch) {
      const s = state.saved.find((x) => x.id === id && x.ownerMemberId === me().memberId);
      if (!s) throw new Error("Connection not found.");
      if (patch.status && patch.status !== s.status) s.events.unshift({ from: s.status, to: patch.status, at: now() });
      Object.assign(s, patch, { updatedAt: now() });
      commit(null);
    },
    async removeConnection(id) {
      state.saved = state.saved.filter((x) => !(x.id === id && x.ownerMemberId === me().memberId));
      commit(null);
    },

    async listMeetings() {
      const mine = me().memberId;
      return clone(state.meetings.filter((m) => isLeader() || m.memberA === mine || m.memberB === mine));
    },
    async createMeeting(m) {
      const mine = myMember();
      if (m.memberA !== mine && m.memberB !== mine) throw new Error("You can only plan meetings you take part in.");
      const meeting: Meeting = { ...m, id: uid(), createdAt: now() };
      state.meetings.unshift(meeting);
      return commit(clone(meeting));
    },
    async updateMeeting(id, patch) {
      const mine = me().memberId;
      const m = state.meetings.find((x) => x.id === id && (x.memberA === mine || x.memberB === mine));
      if (!m) throw new Error("Meeting not found.");
      Object.assign(m, patch);
      commit(null);
    },

    async listReferrals() {
      const mine = me().memberId;
      return clone(state.referrals.filter((r) => isLeader() || r.giverId === mine || r.receiverId === mine));
    },
    async recordReferral(r) {
      const mine = myMember();
      if (!r.consentConfirmed) throw new Error("Confirm that both members agree to this referral being recorded.");
      if (r.giverId !== mine && r.receiverId !== mine) throw new Error("You can only record referrals you gave or received.");
      if (r.giverId === r.receiverId) throw new Error("Giver and receiver must be different members.");
      state.referrals.unshift({ id: uid(), giverId: r.giverId, receiverId: r.receiverId, status: r.status, description: r.description, businessValue: r.businessValue, createdAt: now() });
      commit(null);
    },
    async updateReferral(id, patch) {
      const mine = me().memberId;
      const r = state.referrals.find((x) => x.id === id && (x.giverId === mine || x.receiverId === mine));
      if (!r) throw new Error("Referral not found.");
      Object.assign(r, patch);
      commit(null);
    },

    async myFeedback() {
      return clone(state.feedback.filter((f) => f.userId === me().userId));
    },
    async giveFeedback(key, giverId, receiverId, verdict, note) {
      const existing = state.feedback.find((f) => f.userId === me().userId && f.key === key);
      if (existing) Object.assign(existing, { verdict, note: note ?? null });
      else state.feedback.push({ id: uid(), key, giverId, receiverId, verdict, note: note ?? null, userId: me().userId, resolution: null, createdAt: now() });
      commit(null);
    },

    async analytics(): Promise<Analytics> {
      requireLeader();
      const counted = state.referrals.filter((r) => r.status !== "referral_opportunity_identified");
      const pairs = new Map<string, number>();
      for (const r of counted) {
        const [a, b] = [r.giverId, r.receiverId].sort();
        pairs.set(`${a}|${b}`, (pairs.get(`${a}|${b}`) ?? 0) + 1);
      }
      const active = state.members.filter((m) => m.status === "active");
      return {
        activeMembers: active.length,
        introductions: counted.length,
        accepted: counted.filter((r) => ["referral_accepted", "business_meeting_completed", "business_closed"].includes(r.status)).length,
        closed: counted.filter((r) => r.status === "business_closed").length,
        businessGenerated: counted.filter((r) => r.status === "business_closed").reduce((s, r) => s + (r.businessValue ?? 0), 0),
        meetingsCompleted: state.meetings.filter((m) => m.status === "completed").length,
        meetingsPlanned: state.meetings.filter((m) => m.status === "planned" || m.status === "scheduled").length,
        savedConnections: state.saved.length,
        feedbackUseful: state.feedback.filter((f) => f.verdict === "useful").length,
        feedbackInaccurate: state.feedback.filter((f) => f.verdict === "inaccurate").length,
        topPartnerships: [...pairs.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, n]) => ({ a: k.split("|")[0], b: k.split("|")[1], referrals: n })),
        participation: active.map((m) => ({
          member_id: m.id,
          given: counted.filter((r) => r.giverId === m.id).length,
          received: counted.filter((r) => r.receiverId === m.id).length,
          meetings: state.meetings.filter((x) => (x.memberA === m.id || x.memberB === m.id) && x.status === "completed").length,
        })),
      };
    },
    async allFeedback() {
      requireLeader();
      return clone(state.feedback);
    },
    async resolveFeedback(id, resolution, suppress) {
      requireAdmin();
      const f = state.feedback.find((x) => x.id === id);
      if (!f) throw new Error("Feedback not found.");
      f.resolution = resolution;
      if (suppress && !state.suppressed.some((s) => s.key === f.key)) {
        state.suppressed.push({ key: f.key, reason: resolution });
        audit("suppressed_recommendations.insert", "suppressed_recommendations", f.key, { reason: resolution });
      }
      commit(null);
    },
    async suppressedKeys() {
      return state.suppressed.map((s) => s.key);
    },
    async unsuppress(key) {
      requireAdmin();
      state.suppressed = state.suppressed.filter((s) => s.key !== key);
      audit("suppressed_recommendations.delete", "suppressed_recommendations", key);
      commit(null);
    },

    async getSettings() {
      return clone(state.settings);
    },
    async saveSettings(s) {
      requireAdmin();
      const v = svc.validateSettings(s);
      if (!v.ok) throw new Error(v.errors.join(" "));
      state.settings = clone(s);
      audit("chapters.update", "chapters", CHAPTER.id, { settings: s });
      commit(null);
    },
    async importPreview(rows, mapping) {
      requireAdmin();
      return buildImportPlan(rows, mapping, state.members.map((m) => ({ id: m.id, externalId: m.externalId, email: state.contacts[m.id]?.email ?? null, fullName: m.fullName, company: m.company })));
    },
    async importCommit(rows, mapping, filename, options) {
      requireAdmin();
      const plan = await backend.importPreview(rows, mapping);
      const { writes, skipped } = svc.planWrites(plan, state.members, options);
      const failures: { rowNumber: number; message: string }[] = [];
      let created = 0;
      let updated = 0;
      const jobId = uid();
      const COL_TO_FIELD: Record<string, keyof MemberProfile> = {
        external_id: "externalId", full_name: "fullName", company: "company", category_id: "categoryId", category_label: "categoryLabel",
        business_description: "businessDescription", website: "website", photo_url: "photoUrl", company_sizes: "companySizes",
        service_areas: "serviceAreas", problems_solved: "problemsSolved", keywords: "keywords", icp_description: "icpDescription", ideal_referral: "idealReferral",
      };
      for (const w of writes) {
        try {
          const email = w.contact?.email;
          if (email && Object.entries(state.contacts).some(([id, c]) => c.email === email && id !== w.memberId)) throw new Error("Email already belongs to another member.");
          let m: MemberProfile | undefined;
          if (w.kind === "create") {
            m = {
              id: uid(), chapterId: CHAPTER.id, fullName: "", services: [], customerSegments: [], companySizes: [], industries: [], serviceAreas: [],
              problemsSolved: [], keywords: [], relationships: [], sphereIds: [], status: "active", isDemo, source: options.source ?? "csv_import", fieldProvenance: {},
            };
            state.members.push(m);
            created++;
          } else {
            m = state.members.find((x) => x.id === w.memberId);
            if (!m) throw new Error("Matched member no longer exists.");
            updated++;
          }
          const before = clone(m);
          for (const [col, v] of Object.entries(w.columns)) (m as unknown as Record<string, unknown>)[COL_TO_FIELD[col]] = v;
          if (w.services) m.services = w.services;
          if (w.segments) m.customerSegments = w.segments;
          if (w.industries) m.industries = w.industries;
          m.fieldProvenance = { ...(m.fieldProvenance ?? {}), ...w.provenance, ...(w.services ? { services: "verified" } : {}), ...(w.segments ? { customerSegments: "verified" } : {}), ...(w.industries ? { industries: "verified" } : {}) };
          m.profileUpdatedAt = now();
          if (w.contact) state.contacts[m.id] = { email: w.contact.email ?? state.contacts[m.id]?.email ?? null, phone: w.contact.phone ?? state.contacts[m.id]?.phone ?? null, visibility: state.contacts[m.id]?.visibility ?? "chapter" };
          if (w.avgTransactionValue != null) state.priv[m.id] = { avgTransactionValue: w.avgTransactionValue, shareWithLeadership: state.priv[m.id]?.shareWithLeadership ?? false };
          history(m.id, w.kind === "create" ? "insert" : "update", w.kind === "create" ? { import_job: jobId } : { import_job: jobId, before: before.fullName });
        } catch (e) {
          failures.push({ rowNumber: w.rowNumber, message: (e as Error).message });
        }
      }
      const totals = { ...plan.totals, created, updated, failed: failures.length, skipped: skipped.length };
      state.importJobs.unshift({ id: jobId, filename, status: "completed", totals, issues: [...plan.rows.flatMap((r) => r.issues), ...failures.map((f) => ({ ...f, severity: "error" }))], createdAt: now() });
      audit("import_jobs.insert", "import_jobs", jobId, { filename, totals });
      commit(null);
      return { jobId, totals, skipped, failures };
    },
    async listImportJobs() {
      requireAdmin();
      return clone(state.importJobs);
    },
    async createMember(p, contact) {
      requireAdmin();
      if (!p.fullName?.trim()) throw new Error("Full name is required.");
      if (p.externalId && state.members.some((m) => m.externalId?.toLowerCase() === p.externalId?.toLowerCase())) throw new Error("A member with this member ID already exists.");
      const m: MemberProfile = {
        id: uid(), chapterId: CHAPTER.id, fullName: p.fullName.trim(), externalId: p.externalId ?? null, company: p.company ?? null, categoryId: p.categoryId ?? null,
        categoryLabel: p.categoryLabel ?? null, businessDescription: p.businessDescription ?? null, website: p.website ?? null,
        services: p.services ?? [], customerSegments: p.customerSegments ?? [], companySizes: p.companySizes ?? [], industries: p.industries ?? [],
        serviceAreas: p.serviceAreas ?? [], problemsSolved: p.problemsSolved ?? [], keywords: p.keywords ?? [], icpDescription: p.icpDescription ?? null,
        idealReferral: p.idealReferral ?? null, relationships: [], sphereIds: [], status: "active", isDemo, source: "manual", fieldProvenance: { fullName: "verified" }, profileUpdatedAt: now(),
      };
      state.members.push(m);
      if (contact?.email || contact?.phone) state.contacts[m.id] = { email: contact.email ?? null, phone: contact.phone ?? null, visibility: contact.visibility ?? "chapter" };
      history(m.id, "insert", { source: "manual" });
      audit("member.created", "member", m.id, { source: "manual" });
      return commit(m.id);
    },
    async invite(email, role, memberId) {
      requireAdmin();
      const e = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new Error("Enter a valid email address.");
      if (state.invitations.some((i) => i.email === e && i.status === "pending")) throw new Error("An invitation is already pending for this email.");
      const inv: Invitation = { id: uid(), email: e, role, memberId, status: "pending", createdAt: now() };
      state.invitations.unshift(inv);
      audit("invitations.insert", "invitations", inv.id, { email: e, role });
      commit(null);
      return { note: "Demo mode: no email is sent." };
    },
    async listInvitations() {
      requireAdmin();
      return clone(state.invitations);
    },
    async revokeInvitation(id) {
      requireAdmin();
      const inv = state.invitations.find((i) => i.id === id);
      if (inv) inv.status = "revoked";
      audit("invitations.update", "invitations", id, { status: "revoked" });
      commit(null);
    },
    async memberAccess() {
      requireAdmin();
      return state.members.map((m) => {
        const entry = Object.entries(state.roles).find(([, r]) => r.memberId === m.id);
        return { memberId: m.id, userId: entry?.[0] ?? null, role: entry?.[1].role ?? null };
      });
    },
    async setRole(userId, role) {
      requireAdmin();
      if (userId === me().userId) throw new Error("You cannot change your own role.");
      if (!state.roles[userId]) throw new Error("User not found.");
      state.roles[userId].role = role;
      audit("chapter_roles.update", "chapter_roles", userId, { role });
      commit(null);
    },
    async deactivate(memberId, reason) {
      requireAdmin();
      const m = state.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found.");
      m.status = "inactive";
      history(memberId, "update", { status: { from: "active", to: "inactive" }, reason });
      audit("member.status_changed", "member", memberId, { to: "inactive", reason });
      commit(null);
    },
    async reactivate(memberId) {
      requireAdmin();
      const m = state.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found.");
      m.status = "active";
      history(memberId, "update", { status: { from: "inactive", to: "active" } });
      audit("member.status_changed", "member", memberId, { to: "active" });
      commit(null);
    },
    async erase(memberId) {
      requireAdmin();
      const m = state.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found.");
      if (Object.values(state.roles).some((r) => r.memberId === memberId)) throw new Error(isDemo ? "Demo personas cannot be erased." : "Unlink yourself from this member in Settings before erasing it.");
      state.members = state.members.filter((x) => x.id !== memberId);
      delete state.contacts[memberId];
      delete state.priv[memberId];
      delete state.history[memberId];
      state.saved = state.saved.filter((s) => s.ownerMemberId !== memberId && s.targetMemberId !== memberId);
      state.meetings = state.meetings.filter((s) => s.memberA !== memberId && s.memberB !== memberId);
      state.referrals = state.referrals.filter((s) => s.giverId !== memberId && s.receiverId !== memberId);
      audit("member.deleted", "member", memberId, { full_name: m.fullName });
      commit(null);
    },
    async auditLog() {
      requireAdmin();
      return clone(state.audit.slice(0, 200));
    },
    async setSphereMembership(memberId, sphereKey, member) {
      requireAdmin();
      const m = state.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found.");
      m.sphereIds = member ? [...new Set([...m.sphereIds, sphereKey])] : m.sphereIds.filter((s) => s !== sphereKey);
      audit("contact_sphere_memberships." + (member ? "insert" : "delete"), "contact_sphere_memberships", memberId, { sphere: sphereKey });
      commit(null);
    },
  };
  return backend;
}
