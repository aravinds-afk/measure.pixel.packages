// LIVE backend: Supabase Auth + Postgres (RLS-protected) + the `api` Edge Function for scoring and imports.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, type ChapterSettings, type MemberProfile } from "@engine/index.ts";
import { profileToMemberColumns, rowToProfile, type MemberProfileRow } from "@shared/mapping.ts";
import type { Backend, ConnectionStatus, Feedback, Meeting, ProfilePatch, ReferralRecord, Role, SavedConnection, Session } from "./types.ts";

const CHAPTER_KEY = "connectsphere-chapter";

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  let cached: Session | null = null;

  const must = <T,>(r: { data: T; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };
  const session = async () => {
    const s = cached ?? (await backend.getSession());
    if (!s) throw new Error("Sign in required.");
    return s;
  };
  const api = async <T,>(action: string, body: Record<string, unknown> = {}): Promise<T> => {
    const s = await session();
    const { data, error } = await sb.functions.invoke("api", { body: { action, chapterId: s.chapterId, ...body } });
    if (error) {
      // Surface the function's own error message when it returned one.
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json().catch(() => null);
        if (payload?.error) throw new Error(payload.error);
      }
      throw new Error(error.message);
    }
    return data as T;
  };
  const myMemberId = async () => {
    const s = await session();
    if (!s.memberId) throw new Error("Your account is not linked to a member profile yet. Ask your chapter admin.");
    return s.memberId;
  };

  const mapSaved = (r: Record<string, unknown>): SavedConnection => ({
    id: r.id as string,
    ownerMemberId: r.owner_member_id as string,
    targetMemberId: r.target_member_id as string,
    status: r.status as ConnectionStatus,
    score: (r.score as number) ?? null,
    notes: (r.notes as string) ?? null,
    scripts: (r.scripts as Record<string, string>) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    events: ((r.connection_events as Record<string, string>[]) ?? [])
      .map((e) => ({ from: (e.from_status as ConnectionStatus) ?? null, to: e.to_status as ConnectionStatus, at: e.created_at }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  });
  const mapMeeting = (r: Record<string, unknown>): Meeting => ({
    id: r.id as string,
    memberA: r.member_a as string,
    memberB: r.member_b as string,
    scheduledFor: (r.scheduled_for as string) ?? null,
    status: r.status as Meeting["status"],
    brief: (r.brief as Meeting["brief"]) ?? null,
    agreedNextAction: (r.agreed_next_action as string) ?? null,
    followUpDate: (r.follow_up_date as string) ?? null,
    outcomeNotes: (r.outcome_notes as string) ?? null,
    createdAt: r.created_at as string,
  });
  const mapReferral = (r: Record<string, unknown>): ReferralRecord => ({
    id: r.id as string,
    giverId: r.giver_member_id as string,
    receiverId: r.receiver_member_id as string,
    status: r.status as ReferralRecord["status"],
    description: (r.description as string) ?? null,
    businessValue: r.business_value == null ? null : Number(r.business_value),
    createdAt: r.created_at as string,
  });
  const mapFeedback = (r: Record<string, unknown>): Feedback => ({
    id: r.id as string,
    key: r.recommendation_key as string,
    giverId: (r.giver_member_id as string) ?? null,
    receiverId: (r.receiver_member_id as string) ?? null,
    verdict: r.verdict as Feedback["verdict"],
    note: (r.note as string) ?? null,
    userId: r.user_id as string,
    resolution: (r.admin_resolution as string) ?? null,
    createdAt: r.created_at as string,
  });

  async function replaceList(table: string, col: string, memberId: string, values: string[]) {
    must(await sb.from(table).delete().eq("member_id", memberId));
    if (values.length) must(await sb.from(table).insert(values.map((v) => ({ member_id: memberId, [col]: v }))));
  }

  const backend: Backend = {
    mode: "live",
    async getSession() {
      const { data } = await sb.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        cached = null;
        return null;
      }
      // Apply any pending invitation for this email (idempotent).
      await sb.rpc("accept_invitation");
      const roles = must(await sb.from("chapter_roles").select("chapter_id, role, chapters(name, is_demo)").eq("user_id", user.id)) as unknown as {
        chapter_id: string; role: Role; chapters: { name: string; is_demo: boolean } | null;
      }[];
      if (!roles.length) {
        cached = null;
        throw new Error("Your account is not a member of any chapter yet. Ask your chapter admin for an invitation.");
      }
      let preferred: string | null = null;
      try {
        preferred = localStorage.getItem(CHAPTER_KEY);
      } catch {
        preferred = null;
      }
      const r = roles.find((x) => x.chapter_id === preferred) ?? roles[0];
      const mem = must(await sb.from("members").select("id").eq("chapter_id", r.chapter_id).eq("user_id", user.id).maybeSingle()) as { id: string } | null;
      cached = { userId: user.id, email: user.email ?? "", role: r.role, memberId: mem?.id ?? null, chapterId: r.chapter_id, chapterName: r.chapters?.name ?? "Chapter", isDemo: !!r.chapters?.is_demo };
      return cached;
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange(() => {
        cached = null;
        cb();
      });
      return () => data.subscription.unsubscribe();
    },
    async signInWithPassword(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async sendMagicLink(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      await sb.auth.signOut();
      cached = null;
    },
    async setPassword(password) {
      if (password.length < 10) throw new Error("Use at least 10 characters.");
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },

    async listMembers() {
      const s = await session();
      const rows = must(await sb.from("member_profiles").select("*").eq("chapter_id", s.chapterId).order("full_name")) as MemberProfileRow[];
      return rows.map(rowToProfile);
    },
    async getContact(memberId) {
      const r = must(await sb.from("member_contacts").select("email, phone, visibility").eq("member_id", memberId).maybeSingle()) as Record<string, string> | null;
      return r ? { email: r.email ?? null, phone: r.phone ?? null, visibility: r.visibility as "chapter" | "private" } : null;
    },
    async updateContact(memberId, c) {
      must(await sb.from("member_contacts").upsert({ member_id: memberId, email: c.email || null, phone: c.phone || null, visibility: c.visibility }, { onConflict: "member_id" }));
    },
    async getPrivate(memberId) {
      const r = must(await sb.from("member_private").select("avg_transaction_value, share_with_leadership").eq("member_id", memberId).maybeSingle()) as Record<string, unknown> | null;
      return r ? { avgTransactionValue: r.avg_transaction_value == null ? null : Number(r.avg_transaction_value), shareWithLeadership: !!r.share_with_leadership } : null;
    },
    async updatePrivate(memberId, p) {
      must(await sb.from("member_private").upsert({ member_id: memberId, avg_transaction_value: p.avgTransactionValue, share_with_leadership: p.shareWithLeadership }, { onConflict: "member_id" }));
    },
    async updateProfile(memberId, patch: ProfilePatch) {
      const cols = profileToMemberColumns(patch);
      if (Object.keys(cols).length) {
        const rows = must(await sb.from("members").update(cols).eq("id", memberId).select("id")) as unknown[];
        if (!rows.length) throw new Error("You do not have permission to edit this profile.");
      }
      if (patch.services) await replaceList("member_services", "name", memberId, patch.services);
      if (patch.customerSegments) await replaceList("member_icps", "segment", memberId, patch.customerSegments);
      if (patch.industries) {
        const ids: string[] = [];
        for (const name of patch.industries) {
          const found = must(await sb.from("industries").select("id").ilike("name", name).maybeSingle()) as { id: string } | null;
          ids.push(found?.id ?? (must(await sb.from("industries").insert({ name }).select("id").single()) as { id: string }).id);
        }
        must(await sb.from("member_industries").delete().eq("member_id", memberId));
        if (ids.length) must(await sb.from("member_industries").insert(ids.map((id) => ({ member_id: memberId, industry_id: id }))));
      }
    },
    async memberHistory(memberId) {
      const rows = must(await sb.from("member_change_history").select("id, operation, changes, changed_at").eq("member_id", memberId).order("changed_at", { ascending: false }).limit(100)) as Record<string, unknown>[];
      return rows.map((r) => ({ id: String(r.id), operation: r.operation as string, changes: r.changes as Record<string, unknown>, changedAt: r.changed_at as string }));
    },

    compatibility: async (a, b) => (await api<{ result: Awaited<ReturnType<Backend["compatibility"]>> }>("compatibility", { memberA: a, memberB: b })).result,
    explain: (a, b) => api("explain", { memberA: a, memberB: b }),
    bestMatches: async (memberId, limit) => (await api<{ matches: Awaited<ReturnType<Backend["bestMatches"]>> }>("bestMatches", { memberId, limit })).matches,
    findPartner: async (query, memberId) => (await api<{ hits: Awaited<ReturnType<Backend["findPartner"]>> }>("findPartner", { query, memberId })).hits,
    nextReferrals: async (memberId) => (await api<{ items: Awaited<ReturnType<Backend["nextReferrals"]>> }>("nextReferrals", { memberId })).items,
    contactSpheres: (memberId) => api("contactSpheres", { memberId }),
    brief: async (a, b) => (await api<{ brief: Awaited<ReturnType<Backend["brief"]>> }>("brief", { memberA: a, memberB: b })).brief,
    health: () => api("health"),

    async listSaved() {
      const s = await session();
      if (!s.memberId) return [];
      const rows = must(await sb.from("saved_connections").select("*, connection_events(from_status, to_status, created_at)").eq("owner_member_id", s.memberId).order("updated_at", { ascending: false })) as Record<string, unknown>[];
      return rows.map(mapSaved);
    },
    async saveConnection(target, score) {
      const s = await session();
      const owner = await myMemberId();
      const r = must(await sb.from("saved_connections").upsert({ chapter_id: s.chapterId, owner_member_id: owner, target_member_id: target, score }, { onConflict: "owner_member_id,target_member_id", ignoreDuplicates: false }).select("*, connection_events(from_status, to_status, created_at)").single()) as Record<string, unknown>;
      return mapSaved(r);
    },
    async updateConnection(id, patch) {
      must(await sb.from("saved_connections").update(patch).eq("id", id));
    },
    async removeConnection(id) {
      must(await sb.from("saved_connections").delete().eq("id", id));
    },

    async listMeetings() {
      const s = await session();
      const rows = must(await sb.from("one_to_one_meetings").select("*").eq("chapter_id", s.chapterId).order("created_at", { ascending: false })) as Record<string, unknown>[];
      return rows.map(mapMeeting);
    },
    async createMeeting(m) {
      const s = await session();
      const r = must(await sb.from("one_to_one_meetings").insert({
        chapter_id: s.chapterId, member_a: m.memberA, member_b: m.memberB, scheduled_for: m.scheduledFor, status: m.status, brief: m.brief,
        agreed_next_action: m.agreedNextAction, follow_up_date: m.followUpDate, outcome_notes: m.outcomeNotes, created_by: s.userId,
      }).select("*").single()) as Record<string, unknown>;
      return mapMeeting(r);
    },
    async updateMeeting(id, patch) {
      const cols: Record<string, unknown> = {};
      if ("scheduledFor" in patch) cols.scheduled_for = patch.scheduledFor;
      if ("status" in patch) cols.status = patch.status;
      if ("brief" in patch) cols.brief = patch.brief;
      if ("agreedNextAction" in patch) cols.agreed_next_action = patch.agreedNextAction;
      if ("followUpDate" in patch) cols.follow_up_date = patch.followUpDate;
      if ("outcomeNotes" in patch) cols.outcome_notes = patch.outcomeNotes;
      must(await sb.from("one_to_one_meetings").update(cols).eq("id", id));
    },

    async listReferrals() {
      const s = await session();
      const rows = must(await sb.from("referral_records").select("*").eq("chapter_id", s.chapterId).order("created_at", { ascending: false })) as Record<string, unknown>[];
      return rows.map(mapReferral);
    },
    async recordReferral(r) {
      const s = await session();
      must(await sb.from("referral_records").insert({
        chapter_id: s.chapterId, giver_member_id: r.giverId, receiver_member_id: r.receiverId, status: r.status, description: r.description,
        business_value: r.businessValue, consent_confirmed: r.consentConfirmed, recorded_by: s.userId,
      }));
    },
    async updateReferral(id, patch) {
      const cols: Record<string, unknown> = {};
      if ("status" in patch) cols.status = patch.status;
      if ("businessValue" in patch) cols.business_value = patch.businessValue;
      if ("description" in patch) cols.description = patch.description;
      must(await sb.from("referral_records").update(cols).eq("id", id));
    },

    async myFeedback() {
      const s = await session();
      return (must(await sb.from("recommendation_feedback").select("*").eq("user_id", s.userId)) as Record<string, unknown>[]).map(mapFeedback);
    },
    async giveFeedback(key, giverId, receiverId, verdict, note) {
      const s = await session();
      must(await sb.from("recommendation_feedback").upsert({ chapter_id: s.chapterId, recommendation_key: key, giver_member_id: giverId, receiver_member_id: receiverId, verdict, note: note ?? null, user_id: s.userId }, { onConflict: "user_id,recommendation_key" }));
    },

    async analytics() {
      const s = await session();
      return must(await sb.rpc("chapter_analytics", { p_chapter: s.chapterId })) as Awaited<ReturnType<Backend["analytics"]>>;
    },
    async allFeedback() {
      const s = await session();
      return (must(await sb.from("recommendation_feedback").select("*").eq("chapter_id", s.chapterId).order("created_at", { ascending: false })) as Record<string, unknown>[]).map(mapFeedback);
    },
    async resolveFeedback(id, resolution, suppress) {
      const s = await session();
      const f = must(await sb.from("recommendation_feedback").update({ admin_resolution: resolution, resolved_by: s.userId, resolved_at: new Date().toISOString() }).eq("id", id).select("recommendation_key").single()) as { recommendation_key: string };
      if (suppress) must(await sb.from("suppressed_recommendations").upsert({ chapter_id: s.chapterId, recommendation_key: f.recommendation_key, reason: resolution, suppressed_by: s.userId }));
    },
    async suppressedKeys() {
      const s = await session();
      return (must(await sb.from("suppressed_recommendations").select("recommendation_key").eq("chapter_id", s.chapterId)) as { recommendation_key: string }[]).map((r) => r.recommendation_key);
    },
    async unsuppress(key) {
      const s = await session();
      must(await sb.from("suppressed_recommendations").delete().eq("chapter_id", s.chapterId).eq("recommendation_key", key));
    },

    async getSettings() {
      const s = await session();
      const r = must(await sb.from("chapters").select("settings").eq("id", s.chapterId).single()) as { settings: ChapterSettings };
      return { ...DEFAULT_SETTINGS, ...r.settings };
    },
    async saveSettings(settings) {
      const s = await session();
      const rows = must(await sb.from("chapters").update({ settings }).eq("id", s.chapterId).select("id")) as unknown[];
      if (!rows.length) throw new Error("Chapter admin access required.");
    },
    importPreview: async (rows, mapping) => (await api<{ plan: Awaited<ReturnType<Backend["importPreview"]>> }>("importPreview", { rows, mapping })).plan,
    importCommit: (rows, mapping, filename, options) => api("importCommit", { rows, mapping, filename, options }),
    async listImportJobs() {
      const s = await session();
      const rows = must(await sb.from("import_jobs").select("*").eq("chapter_id", s.chapterId).order("created_at", { ascending: false }).limit(50)) as Record<string, unknown>[];
      return rows.map((r) => ({ id: r.id as string, filename: (r.filename as string) ?? null, status: r.status as string, totals: r.totals as Record<string, number>, issues: r.issues as never, createdAt: r.created_at as string }));
    },
    async createMember(p, contact) {
      const s = await session();
      const cols = profileToMemberColumns(p);
      const r = must(await sb.from("members").insert({ ...cols, external_id: p.externalId ?? null, chapter_id: s.chapterId, source: "manual", field_provenance: { full_name: "verified" } }).select("id").single()) as { id: string };
      if (p.services?.length) await replaceList("member_services", "name", r.id, p.services);
      if (p.customerSegments?.length) await replaceList("member_icps", "segment", r.id, p.customerSegments);
      if (p.industries?.length) await backend.updateProfile(r.id, { industries: p.industries });
      if (contact?.email || contact?.phone) await backend.updateContact(r.id, { email: contact.email ?? null, phone: contact.phone ?? null, visibility: contact.visibility ?? "chapter" });
      return r.id;
    },
    invite: (email, role, memberId) => api("invite", { email, role, memberId, redirectTo: window.location.origin }),
    async listInvitations() {
      const s = await session();
      const rows = must(await sb.from("invitations").select("*").eq("chapter_id", s.chapterId).order("created_at", { ascending: false })) as Record<string, unknown>[];
      return rows.map((r) => ({ id: r.id as string, email: r.email as string, role: r.role as Role, memberId: (r.member_id as string) ?? null, status: r.status as string, createdAt: r.created_at as string }));
    },
    async revokeInvitation(id) {
      must(await sb.from("invitations").update({ status: "revoked" }).eq("id", id));
    },
    async memberAccess() {
      const s = await session();
      const [members, roles] = await Promise.all([
        sb.from("members").select("id, user_id").eq("chapter_id", s.chapterId),
        sb.from("chapter_roles").select("user_id, role").eq("chapter_id", s.chapterId),
      ]);
      const roleOf = new Map((must(roles) as { user_id: string; role: Role }[]).map((r) => [r.user_id, r.role]));
      return (must(members) as { id: string; user_id: string | null }[]).map((m) => ({ memberId: m.id, userId: m.user_id, role: m.user_id ? roleOf.get(m.user_id) ?? null : null }));
    },
    async setRole(userId, role) {
      const s = await session();
      if (userId === s.userId) throw new Error("You cannot change your own role.");
      must(await sb.from("chapter_roles").update({ role }).eq("chapter_id", s.chapterId).eq("user_id", userId));
    },
    async deactivate(memberId, reason) {
      must(await sb.rpc("deactivate_member", { p_member: memberId, p_reason: reason }));
    },
    async reactivate(memberId) {
      must(await sb.rpc("reactivate_member", { p_member: memberId }));
    },
    async erase(memberId) {
      must(await sb.rpc("erase_member", { p_member: memberId }));
    },
    async auditLog() {
      const s = await session();
      const rows = must(await sb.from("audit_logs").select("*").eq("chapter_id", s.chapterId).order("created_at", { ascending: false }).limit(200)) as Record<string, unknown>[];
      return rows.map((r) => ({ id: String(r.id), action: r.action as string, entity: r.entity as string, entityId: (r.entity_id as string) ?? null, details: r.details as Record<string, unknown>, createdAt: r.created_at as string }));
    },
    async setSphereMembership(memberId, sphereKey, member) {
      const s = await session();
      const sphere = must(await sb.from("contact_spheres").select("id").is("chapter_id", null).eq("template_key", sphereKey).single()) as { id: string };
      if (member) must(await sb.from("contact_sphere_memberships").upsert({ sphere_id: sphere.id, member_id: memberId, chapter_id: s.chapterId }));
      else must(await sb.from("contact_sphere_memberships").delete().eq("sphere_id", sphere.id).eq("member_id", memberId));
    },
  };
  return backend;
}

export type { MemberProfile };
