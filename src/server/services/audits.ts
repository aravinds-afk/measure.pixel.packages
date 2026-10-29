import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { BUSINESS_GOALS } from "@/data/defaults";
import { formatBand } from "@/lib/money";
import { recommend, type RecommendationResult } from "@/lib/recommend";
import { newId } from "@/lib/ids";
import type { CurrentUser } from "../auth";
import { loadCatalogRows, toEngineCatalog } from "../catalog";
import type { DB } from "../db";
import * as s from "../db/schema";
import type { DiscoveryResult } from "../discovery/analyze";
import { HttpError } from "../http";

const optionalUrl = z.string().trim().max(500).default("");

export const intakeSchema = z
  .object({
    website: optionalUrl,
    businessName: z.string().trim().max(200).default(""),
    instagram: optionalUrl,
    linkedin: optionalUrl,
    youtube: optionalUrl,
    otherLinks: z.array(z.string().trim().max(500)).max(10).default([]),
    clientId: z.string().max(40).optional(),
    idempotencyKey: z.string().min(8).max(80),
  })
  .refine((v) => v.clientId || v.website || v.businessName || v.instagram || v.linkedin || v.youtube || v.otherLinks.some(Boolean), {
    message: "Enter a website, a business name or at least one profile link",
  });

/** Creates (or reuses) the client and opens a draft audit. Idempotent per key. */
export async function startAudit(db: DB, user: CurrentUser, input: z.infer<typeof intakeSchema>) {
  const auditId = `AU-${input.idempotencyKey.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase()}`;
  const [existing] = await db.select().from(s.audits).where(eq(s.audits.id, auditId));
  if (existing) return existing;

  let clientId = input.clientId;
  if (clientId) {
    const [c] = await db.select().from(s.clients).where(eq(s.clients.id, clientId));
    if (!c) throw new HttpError(404, "Client not found");
  } else {
    clientId = newId("CL");
    await db.insert(s.clients).values({
      id: clientId,
      businessName: input.businessName || hostLabel(input.website) || "Untitled business",
      website: input.website,
      instagram: input.instagram,
      linkedin: input.linkedin,
      youtube: input.youtube,
      otherLinks: input.otherLinks.filter(Boolean),
      createdBy: user.id,
      lastContactAt: new Date().toISOString(),
    });
  }
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, clientId));
  const [audit] = await db
    .insert(s.audits)
    .values({ id: auditId, clientId, industryId: client.industryId, createdBy: user.id })
    .onConflictDoNothing()
    .returning();
  return audit ?? (await db.select().from(s.audits).where(eq(s.audits.id, auditId)))[0];
}

function hostLabel(url: string) {
  try {
    return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const responseSchema = z.object({
  status: z.enum(["working_well", "needs_improvement", "missing", "not_applicable", "not_assessed"]),
  notes: z.string().max(2000).optional(),
  evidence: z.string().max(2000).optional(),
  source: z.enum(["auto-verified", "auto-inferred", "consultant"]).optional(),
  confirmedByClient: z.boolean().optional(),
  suggestion: z.object({ status: z.string(), note: z.string(), evidence: z.string().optional() }).nullable().optional(),
});

export const auditPatchSchema = z.object({
  rev: z.number().int(),
  industryId: z.string().max(80).nullable().optional(),
  goals: z.array(z.enum(BUSINESS_GOALS.map((g) => g.id) as [string, ...string[]])).max(20).optional(),
  goalNotes: z.string().max(5000).optional(),
  painOfferIds: z.array(z.string().max(80)).max(20).optional(),
  budgetMonthly: z.number().int().min(0).max(10_000_000_000).nullable().optional(),
  readiness: z.enum(["now", "next-quarter", "exploring"]).nullable().optional(),
  responses: z.record(z.string().max(80), responseSchema).optional(),
  customItems: z
    .array(z.object({ id: z.string().max(40), categoryId: z.string().max(40), label: z.string().min(1).max(300), priority: z.enum(["high", "medium", "low"]), serviceIds: z.array(z.string().max(80)).max(10) }))
    .max(50)
    .optional(),
  consultantNotes: z.string().max(10000).optional(),
  status: z.enum(["draft", "completed"]).optional(),
  client: z
    .object({
      businessName: z.string().trim().min(1).max(200),
      website: z.string().max(500),
      contactPerson: z.string().max(200),
      phone: z.string().max(50),
      email: z.string().max(200),
      instagram: z.string().max(500),
      linkedin: z.string().max(500),
      youtube: z.string().max(500),
      notes: z.string().max(5000),
      nextFollowUp: z.string().max(20).nullable(),
    })
    .partial()
    .optional(),
});

export async function updateAudit(db: DB, id: string, patch: z.infer<typeof auditPatchSchema>) {
  const [a] = await db.select().from(s.audits).where(eq(s.audits.id, id));
  if (!a) throw new HttpError(404, "Audit not found");
  if (a.rev !== patch.rev) throw new HttpError(409, "This audit was changed in another window. Reload to continue.");
  const { rev, client, ...fields } = patch;
  const [row] = await db
    .update(s.audits)
    .set({ ...fields, rev: rev + 1, updatedAt: new Date().toISOString() })
    .where(and(eq(s.audits.id, id), eq(s.audits.rev, rev)))
    .returning();
  if (!row) throw new HttpError(409, "This audit was changed in another window. Reload to continue.");
  const clientSet: Partial<typeof s.clients.$inferInsert> = { ...(client ?? {}), updatedAt: new Date().toISOString(), lastContactAt: new Date().toISOString() };
  if (patch.industryId !== undefined) clientSet.industryId = patch.industryId;
  await db.update(s.clients).set(clientSet).where(eq(s.clients.id, a.clientId));
  return row;
}

/**
 * Applies discovery results. Statuses are set only from verified evidence and
 * never over a consultant's own answer; weaker signals become suggestions.
 */
export function applyDiscovery(responses: Record<string, s.AuditResponseRow>, d: DiscoveryResult) {
  const next = { ...responses };
  for (const p of d.prefill) {
    const cur = next[p.itemId];
    if (cur?.source === "consultant") continue;
    const evidence = [p.evidence, p.evidenceUrl].filter(Boolean).join(" — ");
    if (p.status) next[p.itemId] = { ...cur, status: p.status, source: "auto-verified", evidence, suggestion: null };
    else
      next[p.itemId] = {
        ...cur,
        status: cur?.status ?? "not_assessed",
        evidence: evidence || cur?.evidence,
        suggestion: p.suggestion ? { ...p.suggestion, evidence } : cur?.suggestion ?? null,
      };
  }
  return next;
}

export async function computeRecommendations(db: DB, auditId: string): Promise<{ result: RecommendationResult; decisions: Record<string, string> }> {
  const [a] = await db.select().from(s.audits).where(eq(s.audits.id, auditId));
  if (!a) throw new HttpError(404, "Audit not found");
  const rows = await loadCatalogRows(db);
  const industry = rows.industries.find((i) => i.id === a.industryId);
  const result = recommend(toEngineCatalog(rows, a.customItems), {
    industryId: a.industryId,
    industryClusterId: industry?.clusterId ?? null,
    goals: a.goals,
    painOfferIds: a.painOfferIds,
    responses: a.responses,
    budgetMonthly: a.budgetMonthly,
    readiness: (a.readiness as "now" | "next-quarter" | "exploring" | null) ?? null,
  });
  const saved = await db.select().from(s.recommendations).where(eq(s.recommendations.auditId, auditId));
  return { result, decisions: Object.fromEntries(saved.map((r) => [r.key, r.decision])) };
}

export const decisionsSchema = z.object({
  decisions: z.record(z.string().max(120), z.enum(["pending", "accepted", "removed", "deferred"])),
});

/**
 * Persists the recommendation set with the consultant's decisions. An item
 * the engine did not recommend but the consultant accepted is an override.
 */
export async function saveRecommendations(db: DB, auditId: string, decisions: Record<string, "pending" | "accepted" | "removed" | "deferred">) {
  const { result } = await computeRecommendations(db, auditId);
  const rows: (typeof s.recommendations.$inferInsert)[] = [];
  const primaryKeys = new Set(result.offers.map((o) => o.key).concat(result.supporting.map((x) => x.key)));
  const defaultDecision = (key: string) => (primaryKeys.has(key) ? "accepted" : "pending");
  for (const o of [...result.offers, ...result.otherOffers]) {
    const decision = decisions[o.key] ?? defaultDecision(o.key);
    const band = [
      o.pricing.upfrontIncluded ? "Setup included" : o.pricing.upfrontMin != null ? `${o.pricing.upfrontKind === "project" ? "Project" : "Setup"} ${formatBand(o.pricing.upfrontMin, o.pricing.upfrontMax ?? o.pricing.upfrontMin)}` : "",
      o.pricing.monthlyMin != null ? `Monthly ${formatBand(o.pricing.monthlyMin, o.pricing.monthlyMax ?? o.pricing.monthlyMin)}${o.pricing.monthlyTermMonths ? ` × ${o.pricing.monthlyTermMonths}` : ""}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    rows.push({ id: `${auditId}-${o.key}`, auditId, key: o.key, group: "offer", offerId: o.offerId, reason: o.why, priority: o.priority, recommendedPrice: band, decision, consultantOverride: decision !== defaultDecision(o.key) && decision !== "pending" });
  }
  for (const x of result.supporting) {
    const decision = decisions[x.key] ?? defaultDecision(x.key);
    rows.push({ id: `${auditId}-${x.key}`, auditId, key: x.key, group: "supporting", serviceId: x.serviceId, reason: x.reason, priority: x.priority, recommendedPrice: "Price set in configurator", decision, consultantOverride: decision !== "accepted" });
  }
  for (const x of result.inPlace) {
    const decision = decisions[x.key] ?? "removed";
    rows.push({ id: `${auditId}-${x.key}`, auditId, key: x.key, group: "in_place", serviceId: x.serviceId, reason: x.reason === "in_place" ? "Already in place" : "Not needed now", priority: "low", recommendedPrice: "", decision, consultantOverride: decision === "accepted" });
  }
  // Consultant-added catalogue items that the engine did not propose.
  for (const [key, decision] of Object.entries(decisions)) {
    if (rows.some((r) => r.key === key) || decision !== "accepted") continue;
    const [kind, id] = key.split(":");
    if (kind !== "offer" && kind !== "service") continue;
    rows.push({ id: `${auditId}-${key}`, auditId, key, group: kind === "offer" ? "offer" : "supporting", offerId: kind === "offer" ? id : null, serviceId: kind === "service" ? id : null, reason: "Added by consultant", priority: "medium", decision: "accepted", consultantOverride: true });
  }
  await db.transaction(async (tx) => {
    await tx.delete(s.recommendations).where(eq(s.recommendations.auditId, auditId));
    if (rows.length) await tx.insert(s.recommendations).values(rows);
  });
  return rows;
}
