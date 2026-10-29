import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { CurrentUser } from "../auth";
import type { DB } from "../db";
import * as s from "../db/schema";
import { discover, suggestIndustries, type DiscoveryResult, type Prefill } from "../discovery/analyze";
import type { Fetcher } from "../discovery/fetcher";
import { fetchInstagram, type InstagramResult } from "../discovery/instagram";
import { HttpError } from "../http";
import type { Settings } from "../settings";
import { saveRecommendations, startAudit } from "./audits";
import { docFromAudit } from "./quote-from-audit";
import { createQuote } from "./quotes";

/**
 * One-step audit: links in, prescription out.
 * Website + Instagram are read in parallel; verified evidence sets audit
 * statuses, weaker signals are applied as "auto-inferred" (shown as such and
 * overridable); industry is detected from site copy / Instagram bio; the
 * recommendation engine prescribes offers and a draft quotation is built.
 * Nothing the public web cannot show (ad spend, CRM, response times) is
 * invented — those items stay "not assessed" and become questions to ask.
 */

export const autoAuditSchema = z
  .object({
    website: z.string().trim().max(500).default(""),
    instagram: z.string().trim().max(500).default(""),
    linkedin: z.string().trim().max(500).default(""),
    youtube: z.string().trim().max(500).default(""),
    businessName: z.string().trim().max(200).default(""),
    clientId: z.string().max(40).optional(),
    idempotencyKey: z.string().min(8).max(80),
  })
  .refine((v) => v.website || v.instagram || v.clientId, { message: "Enter a website or an Instagram link" });

export type AutoAuditSummary = {
  auditId: string;
  clientId: string;
  quoteId: string | null;
  website: { inspected: boolean; pages: number; error?: string };
  instagram: { status: InstagramResult["status"] | "skipped"; message?: string };
  industryDetected: string | null;
  verified: number;
  inferred: number;
};

type Deps = { fetcher?: Fetcher; fetchImpl?: typeof fetch };

export function applyAutomatic(responses: Record<string, s.AuditResponseRow>, prefill: Prefill[]) {
  const next = { ...responses };
  for (const p of prefill) {
    const cur = next[p.itemId];
    if (cur?.source === "consultant") continue;
    const evidence = [p.evidence, p.evidenceUrl].filter(Boolean).join(" — ");
    if (p.status) next[p.itemId] = { ...cur, status: p.status, source: "auto-verified", evidence, suggestion: null };
    else if (p.suggestion && cur?.source !== "auto-verified")
      next[p.itemId] = { ...cur, status: p.suggestion.status, source: "auto-inferred", evidence: [p.suggestion.note, evidence].filter(Boolean).join(" — "), suggestion: null };
  }
  return next;
}

export async function runAutoAudit(db: DB, user: CurrentUser, settings: Settings, input: z.infer<typeof autoAuditSchema>, deps: Deps = {}): Promise<AutoAuditSummary> {
  const audit = await startAudit(db, user, {
    website: input.website,
    businessName: input.businessName,
    instagram: input.instagram,
    linkedin: input.linkedin,
    youtube: input.youtube,
    otherLinks: [],
    clientId: input.clientId,
    idempotencyKey: input.idempotencyKey,
  });
  // Re-running the same request returns the finished result instead of crawling again.
  if (audit.discovery) return summaryOf(db, audit.id);

  const industries = (await db.select().from(s.industries)).filter((i) => i.active).map((i) => ({ id: i.id, name: i.name, keywords: i.keywords }));
  const [ig, siteFirst] = await Promise.all([
    input.instagram ? fetchInstagram(input.instagram, deps.fetchImpl) : Promise.resolve(null),
    input.website ? discover({ website: input.website, instagram: input.instagram, linkedin: input.linkedin, youtube: input.youtube }, industries, { fetcher: deps.fetcher, budgetMs: 25_000 }) : Promise.resolve(null),
  ]);
  // No website given but the Instagram bio links one: inspect that.
  let site: DiscoveryResult | null = siteFirst;
  if (!site && ig?.status === "ok" && ig.externalUrl && !/linktr\.ee|wa\.me|instagram\.com/i.test(ig.externalUrl)) {
    site = await discover({ website: ig.externalUrl, instagram: input.instagram }, industries, { fetcher: deps.fetcher, budgetMs: 20_000 });
  }
  const discovery: DiscoveryResult = site ?? (await discover({ website: "", instagram: input.instagram, linkedin: input.linkedin, youtube: input.youtube }, industries));
  if (ig?.status === "ok") {
    discovery.observations.push(...ig.observations);
    discovery.prefill.push(...ig.prefill);
    discovery.manualChecks = discovery.manualChecks.filter((m) => m.platform !== "Instagram");
  } else if (ig) {
    discovery.observations.push({ kind: "unknown", area: "Social", text: ig.message });
  }
  if (ig?.status === "ok" && (ig.bio || ig.category)) {
    const fromBio = suggestIndustries(`${ig.category} ${ig.bio}`, industries);
    for (const f of fromBio) if (!discovery.industrySuggestions.some((x) => x.industryId === f.industryId)) discovery.industrySuggestions.push(f);
  }
  (discovery as DiscoveryResult & { instagram?: InstagramResult | null }).instagram = ig;

  const [current] = await db.select().from(s.audits).where(eq(s.audits.id, audit.id));
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, current.clientId));
  const responses = applyAutomatic(current.responses, discovery.prefill);
  const industryId = current.industryId ?? client.industryId ?? discovery.industrySuggestions[0]?.industryId ?? null;
  await db.update(s.audits).set({ discovery, responses, industryId, rev: current.rev + 1, updatedAt: new Date().toISOString() }).where(eq(s.audits.id, audit.id));

  const host = client.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const placeholder = !input.businessName && (client.businessName === host || client.businessName === "Untitled business");
  const detectedName = discovery.businessNameCandidate || (ig?.status === "ok" ? (ig as { handle: string }).handle : "");
  await db
    .update(s.clients)
    .set({
      industryId,
      website: client.website || (site?.finalUrl ?? ""),
      ...(placeholder && detectedName ? { businessName: detectedName } : {}),
      ...(!client.email && discovery.contact.emails[0] ? { email: discovery.contact.emails[0] } : {}),
      ...(!client.phone && discovery.contact.phones[0] ? { phone: discovery.contact.phones[0] } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(s.clients.id, client.id));

  const recs = await saveRecommendations(db, audit.id, {});
  if (recs.some((r) => r.decision === "accepted")) {
    const { doc } = await docFromAudit(db, settings, audit.id);
    await createQuote(db, user, settings, { clientId: client.id, auditId: audit.id, doc, idempotencyKey: `auto-${audit.id}` });
  }
  return summaryOf(db, audit.id);
}

export async function summaryOf(db: DB, auditId: string): Promise<AutoAuditSummary> {
  const [a] = await db.select().from(s.audits).where(eq(s.audits.id, auditId));
  if (!a) throw new HttpError(404, "Audit not found");
  const d = a.discovery as (DiscoveryResult & { instagram?: InstagramResult | null }) | null;
  const [q] = await db.select().from(s.quotes).where(eq(s.quotes.idempotencyKey, `auto-${auditId}`));
  const vals = Object.values(a.responses);
  return {
    auditId: a.id,
    clientId: a.clientId,
    quoteId: q?.id ?? null,
    website: { inspected: !!d?.pages.some((p) => p.ok), pages: d?.pages.filter((p) => p.ok).length ?? 0, error: d?.error },
    instagram: d?.instagram ? { status: d.instagram.status, message: d.instagram.status === "ok" ? undefined : d.instagram.message } : { status: "skipped" },
    industryDetected: a.industryId,
    verified: vals.filter((v) => v.source === "auto-verified").length,
    inferred: vals.filter((v) => v.source === "auto-inferred").length,
  };
}
