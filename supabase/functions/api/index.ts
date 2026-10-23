// ConnectSphere API — Supabase Edge Function (Deno).
// Deterministic scoring runs here, on the server. Reads use the caller's JWT so Row Level Security
// applies; the service role is used only for writes that clients are not allowed to make directly
// (assessments, imports, invitations).

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { buildImportPlan, type ExistingMemberKey } from "../_shared/engine/importer.ts";
import { loadChapterData } from "../_shared/db.ts";
import { provenanceToDb } from "../_shared/mapping.ts";
import {
  bestMatchesFor, briefFor, compatibilityReport, contactSpheresFor, explanationPayload, EXPLANATION_SYSTEM_PROMPT,
  fallbackExplanation, findPartnerIn, healthFor, nextReferralsFor, planWrites, reidentify, ServiceError, validateSettings,
  type ImportOptions, type MemberWrite,
} from "../_shared/service.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim());
const MAX_IMPORT_ROWS = 2000;

function cors(origin: string | null) {
  const allow = ALLOWED_ORIGINS.includes("*") ? "*" : origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) throw new ServiceError(401, "Sign in required.");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new ServiceError(401, "Session expired. Please sign in again.");
    const user = userData.user;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const chapterId = String(body.chapterId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(chapterId)) throw new ServiceError(400, "chapterId is required.");

    const { data: roleRow } = await userClient.from("chapter_roles").select("role").eq("user_id", user.id).eq("chapter_id", chapterId).maybeSingle();
    if (!roleRow) throw new ServiceError(403, "You are not a member of this chapter.");
    const role = roleRow.role as "admin" | "leadership" | "member";
    const requireAdmin = () => { if (role !== "admin") throw new ServiceError(403, "Chapter admin access required."); };

    switch (action) {
      case "compatibility": {
        const data = await loadChapterData(userClient, chapterId);
        const result = compatibilityReport(data, String(body.memberA), String(body.memberB));
        await storeAssessment(admin, chapterId, user.id, result);
        return json({ result }, 200, headers);
      }
      case "explain": {
        const data = await loadChapterData(userClient, chapterId);
        const result = compatibilityReport(data, String(body.memberA), String(body.memberB));
        const a = data.members.find((m) => m.id === result.memberAId)!;
        const b = data.members.find((m) => m.id === result.memberBId)!;
        return json(await explain(result, a, b), 200, headers);
      }
      case "bestMatches": {
        const data = await loadChapterData(userClient, chapterId);
        return json({ matches: bestMatchesFor(data, String(body.memberId), Number(body.limit ?? 10)) }, 200, headers);
      }
      case "findPartner": {
        const data = await loadChapterData(userClient, chapterId);
        return json({ hits: findPartnerIn(data, String(body.query ?? ""), body.memberId ? String(body.memberId) : undefined) }, 200, headers);
      }
      case "nextReferrals": {
        const data = await loadChapterData(userClient, chapterId);
        return json({ items: nextReferralsFor(data, String(body.memberId)) }, 200, headers);
      }
      case "contactSpheres": {
        const data = await loadChapterData(userClient, chapterId);
        return json(contactSpheresFor(data, body.memberId ? String(body.memberId) : undefined), 200, headers);
      }
      case "brief": {
        const data = await loadChapterData(userClient, chapterId);
        return json({ brief: briefFor(data, String(body.memberA), String(body.memberB)) }, 200, headers);
      }
      case "health": {
        const data = await loadChapterData(userClient, chapterId);
        return json(healthFor(data), 200, headers);
      }
      case "validateSettings":
        return json(validateSettings(body.settings), 200, headers);
      case "importPreview": {
        requireAdmin();
        const { plan } = await previewImport(userClient, chapterId, body);
        return json({ plan }, 200, headers);
      }
      case "importCommit": {
        requireAdmin();
        return json(await commitImport(userClient, admin, chapterId, user.id, body), 200, headers);
      }
      case "invite": {
        requireAdmin();
        return json(await invite(admin, chapterId, user.id, body), 200, headers);
      }
      default:
        throw new ServiceError(400, `Unknown action “${action}”.`);
    }
  } catch (e) {
    const status = e instanceof ServiceError ? e.status : 500;
    if (status === 500) console.error(e);
    return json({ error: status === 500 ? "Something went wrong. The error has been logged." : (e as Error).message }, status, headers);
  }
});

// deno-lint-ignore no-explicit-any
type Client = any;

async function storeAssessment(admin: Client, chapterId: string, userId: string, result: ReturnType<typeof compatibilityReport>) {
  const { data, error } = await admin.from("compatibility_assessments").insert({
    chapter_id: chapterId, member_a: result.memberAId, member_b: result.memberBId, score: result.score,
    confidence: result.confidence.value, confidence_level: result.confidence.level, label: result.label,
    result, engine_version: result.engineVersion, weights: result.weightsUsed, computed_by: userId,
  }).select("id").single();
  if (error) throw new Error(error.message);
  const recs = [...result.referrals.aToB, ...result.referrals.bToA].map((o) => ({
    chapter_id: chapterId, assessment_id: data.id, recommendation_key: o.id, giver_member_id: o.giverId, receiver_member_id: o.receiverId, payload: o,
  }));
  if (recs.length) {
    const r = await admin.from("referral_recommendations").insert(recs);
    if (r.error) throw new Error(r.error.message);
  }
}

async function explain(result: ReturnType<typeof compatibilityReport>, a: Parameters<typeof explanationPayload>[1], b: Parameters<typeof explanationPayload>[2]) {
  if (!ANTHROPIC_KEY) return { text: fallbackExplanation(result), source: "deterministic" };
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const payload = explanationPayload(result, a, b);
    // Server-side fallback: if the model declines, the API re-runs the request on a fallback model.
    const msg = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: EXPLANATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    if (msg.stop_reason === "refusal") return { text: fallbackExplanation(result), source: "deterministic" };
    const text = msg.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("\n").trim();
    return { text: text ? reidentify(text, a, b) : fallbackExplanation(result), source: text ? "ai" : "deterministic" };
  } catch (e) {
    console.error("explain failed", e);
    return { text: fallbackExplanation(result), source: "deterministic" };
  }
}

async function previewImport(userClient: Client, chapterId: string, body: Record<string, unknown>) {
  const rows = body.rows as Record<string, unknown>[];
  const mapping = body.mapping as Record<string, string | null>;
  if (!Array.isArray(rows) || !mapping || typeof mapping !== "object") throw new ServiceError(400, "rows and mapping are required.");
  if (rows.length > MAX_IMPORT_ROWS) throw new ServiceError(400, `Import at most ${MAX_IMPORT_ROWS} rows at a time.`);
  const { data: chapter } = await userClient.from("chapters").select("is_demo").eq("id", chapterId).single();
  if (chapter?.is_demo) throw new ServiceError(400, "The demo chapter contains fictional data only. Import real members into a real chapter.");
  const data = await loadChapterData(userClient, chapterId);
  const { data: contacts } = await userClient.from("member_contacts").select("member_id, email");
  const emailOf = new Map((contacts ?? []).map((c: { member_id: string; email: string | null }) => [c.member_id, c.email]));
  // Admins see inactive members too, so returning members are matched instead of duplicated.
  const existing: ExistingMemberKey[] = data.members.map((m) => ({ id: m.id, externalId: m.externalId, email: (emailOf.get(m.id) as string | null) ?? null, fullName: m.fullName, company: m.company }));
  return { plan: buildImportPlan(rows, mapping, existing), data };
}

async function commitImport(userClient: Client, admin: Client, chapterId: string, userId: string, body: Record<string, unknown>) {
  const { plan, data } = await previewImport(userClient, chapterId, body);
  const options = (body.options ?? {}) as ImportOptions;
  const { writes, skipped } = planWrites(plan, data.members, options);
  const source = options.source === "excel_import" ? "excel_import" : "csv_import";
  const { data: job, error: jobErr } = await admin.from("import_jobs").insert({
    chapter_id: chapterId, filename: String(body.filename ?? "upload"), status: "completed", created_by: userId,
    totals: plan.totals, issues: plan.rows.flatMap((r) => r.issues),
  }).select("id").single();
  if (jobErr) throw new Error(jobErr.message);

  const failures: { rowNumber: number; message: string }[] = [];
  let created = 0, updated = 0;
  for (const w of writes) {
    try {
      await applyWrite(admin, chapterId, job.id, source, w, data.members.find((m) => m.id === w.memberId)?.fieldProvenance ?? {});
      w.kind === "create" ? created++ : updated++;
    } catch (e) {
      failures.push({ rowNumber: w.rowNumber, message: (e as Error).message });
    }
  }
  const totals = { ...plan.totals, created, updated, failed: failures.length, skipped: skipped.length };
  await admin.from("import_jobs").update({ totals, issues: [...plan.rows.flatMap((r) => r.issues), ...failures.map((f) => ({ ...f, severity: "error" }))], completed_at: new Date().toISOString(), status: failures.length && !created && !updated ? "failed" : "completed" }).eq("id", job.id);
  return { jobId: job.id, totals, skipped, failures };
}

async function applyWrite(admin: Client, chapterId: string, jobId: string, source: string, w: MemberWrite, currentProv: Record<string, string>) {
  const now = new Date().toISOString();
  let memberId = w.memberId;
  const listProv: Record<string, "verified"> = {};
  if (w.services) listProv.services = "verified";
  if (w.segments) listProv.customerSegments = "verified";
  if (w.industries) listProv.industries = "verified";
  const prov = provenanceToDb({ ...currentProv, ...w.provenance, ...listProv } as Record<string, "verified">);
  delete (prov as Record<string, unknown>).services; delete (prov as Record<string, unknown>).customer_segments; delete (prov as Record<string, unknown>).industries;
  if (w.kind === "create") {
    const { data, error } = await admin.from("members").insert({ ...w.columns, chapter_id: chapterId, source, import_job_id: jobId, imported_at: now, field_provenance: prov }).select("id").single();
    if (error) throw new Error(error.message);
    memberId = data.id;
  } else {
    const { error } = await admin.from("members").update({ ...w.columns, import_job_id: jobId, imported_at: now, field_provenance: prov }).eq("id", memberId).eq("chapter_id", chapterId);
    if (error) throw new Error(error.message);
  }
  const replace = async (table: string, col: string, values: string[]) => {
    await admin.from(table).delete().eq("member_id", memberId).eq("provenance", "verified");
    if (values.length) {
      const r = await admin.from(table).upsert(values.map((v) => ({ member_id: memberId, [col]: v, provenance: "verified" })), { onConflict: `member_id,${col}`, ignoreDuplicates: true });
      if (r.error) throw new Error(r.error.message);
    }
  };
  if (w.services) await replace("member_services", "name", w.services);
  if (w.segments) await replace("member_icps", "segment", w.segments);
  if (w.industries) {
    const ids: string[] = [];
    for (const name of w.industries) {
      const found = await admin.from("industries").select("id").ilike("name", name).maybeSingle();
      if (found.data) ids.push(found.data.id);
      else {
        const ins = await admin.from("industries").insert({ name }).select("id").single();
        if (ins.error) throw new Error(ins.error.message);
        ids.push(ins.data.id);
      }
    }
    await admin.from("member_industries").delete().eq("member_id", memberId).eq("provenance", "verified");
    if (ids.length) await admin.from("member_industries").upsert(ids.map((id) => ({ member_id: memberId, industry_id: id, provenance: "verified" })), { ignoreDuplicates: true });
  }
  if (w.contact) {
    const r = await admin.from("member_contacts").upsert({ member_id: memberId, ...(w.contact.email ? { email: w.contact.email } : {}), ...(w.contact.phone ? { phone: w.contact.phone } : {}) }, { onConflict: "member_id" });
    if (r.error) throw new Error(r.error.message.includes("member_contacts_email_uq") ? "Email already belongs to another member." : r.error.message);
  }
  if (w.avgTransactionValue != null) await admin.from("member_private").upsert({ member_id: memberId, avg_transaction_value: w.avgTransactionValue }, { onConflict: "member_id" });
}

async function invite(admin: Client, chapterId: string, userId: string, body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = ["admin", "leadership", "member"].includes(String(body.role)) ? String(body.role) : "member";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ServiceError(400, "Enter a valid email address.");
  const memberId = body.memberId ? String(body.memberId) : null;
  if (memberId) {
    const { data: m } = await admin.from("members").select("chapter_id").eq("id", memberId).maybeSingle();
    if (m?.chapter_id !== chapterId) throw new ServiceError(400, "Member not found in this chapter.");
  }
  const { error } = await admin.from("invitations").insert({ chapter_id: chapterId, email, role, member_id: memberId, invited_by: userId });
  if (error) throw new ServiceError(400, error.message.includes("invitations_pending_uq") ? "An invitation is already pending for this email." : error.message);
  const redirectTo = String(body.redirectTo ?? "") || undefined;
  const r = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  // Existing accounts cannot be re-invited by Supabase; they accept by signing in.
  return { invited: true, emailSent: !r.error, note: r.error ? "This email already has an account; the invitation is applied the next time they sign in." : undefined };
}
