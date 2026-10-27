import "server-only";
import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { BUSINESS_GOALS } from "@/data/defaults";
import type { QuoteTotals } from "@/lib/pricing";
import type { QuoteDoc } from "@/lib/quote-schema";
import { newId } from "@/lib/ids";
import type { DB } from "../db";
import * as s from "../db/schema";
import { getSheetsConfig, sheetsRequest, SheetsError, type SheetsConfig } from "./client";
import { auditRow, catalogueRows, clientRow, quoteItemRows, quoteRow, recommendationRow, TABS, type Cell, type TabDef } from "./rows";

/**
 * Database-first sync to Google Sheets.
 * - Every canonical write enqueues a job (deduplicated per entity).
 * - Jobs upsert by ID, so retries and re-runs never create duplicate rows.
 * - A short DB lock serialises workers so two appends cannot race.
 * - A job is marked done only after Google confirms every write.
 */

export type SheetsApi = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
export type SyncEntity = (typeof s.syncJobs.$inferSelect)["entity"];
export type SyncOutcome = { status: "synced" | "failed" | "not_configured" | "queued"; error?: string; jobId?: string };

const MAX_ATTEMPTS = 8;

export function defaultApi(): { api: SheetsApi; cfg: SheetsConfig } | null {
  const cfg = getSheetsConfig();
  if (!cfg) return null;
  return { cfg, api: (path, init) => sheetsRequest(cfg, path, init) };
}

// ------------------------------------------------------------------ Jobs ---

export async function enqueue(db: DB, entity: SyncEntity, entityId: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(s.syncJobs)
    .where(and(eq(s.syncJobs.entity, entity), eq(s.syncJobs.entityId, entityId), inArray(s.syncJobs.status, ["pending", "failed"])));
  if (existing) {
    await db.update(s.syncJobs).set({ status: "pending", updatedAt: new Date().toISOString() }).where(eq(s.syncJobs.id, existing.id));
    return existing.id;
  }
  const id = newId("SJ");
  await db.insert(s.syncJobs).values({ id, entity, entityId });
  return id;
}

/** Enqueue and attempt immediately; reports the real outcome of the write. */
export async function syncNow(db: DB, entity: SyncEntity, entityId: string, api = defaultApi()?.api): Promise<SyncOutcome> {
  const jobId = await enqueue(db, entity, entityId);
  if (!api) return { status: "not_configured", jobId };
  return runJobs(db, api, [jobId]).then((r) => r[jobId] ?? { status: "queued", jobId });
}

/** Process due jobs (pending, or failed with attempts left). */
export async function processPending(db: DB, api: SheetsApi, limit = 25) {
  const jobs = await db
    .select({ id: s.syncJobs.id })
    .from(s.syncJobs)
    .where(or(eq(s.syncJobs.status, "pending"), and(eq(s.syncJobs.status, "failed"), lt(s.syncJobs.attempts, MAX_ATTEMPTS))))
    .orderBy(asc(s.syncJobs.createdAt))
    .limit(limit);
  return runJobs(db, api, jobs.map((j) => j.id));
}

async function runJobs(db: DB, api: SheetsApi, ids: string[]): Promise<Record<string, SyncOutcome>> {
  const out: Record<string, SyncOutcome> = {};
  if (!ids.length) return out;
  const locked = await acquireLock(db);
  if (!locked) {
    for (const id of ids) out[id] = { status: "queued", jobId: id, error: "Another sync is running; this write is queued and will retry." };
    return out;
  }
  try {
    await ensureTabs(api);
    for (const id of ids) {
      const [job] = await db.select().from(s.syncJobs).where(eq(s.syncJobs.id, id));
      if (!job || job.status === "done") {
        out[id] = { status: "synced", jobId: id };
        continue;
      }
      try {
        await performJob(db, api, job.entity, job.entityId);
        const t = new Date().toISOString();
        await db.update(s.syncJobs).set({ status: "done", attempts: job.attempts + 1, lastError: null, updatedAt: t, completedAt: t }).where(eq(s.syncJobs.id, id));
        out[id] = { status: "synced", jobId: id };
      } catch (e) {
        const msg = safeMessage(e);
        console.error(`[sheets] job ${id} (${job.entity}) failed: ${msg}`);
        await db.update(s.syncJobs).set({ status: "failed", attempts: job.attempts + 1, lastError: msg, updatedAt: new Date().toISOString() }).where(eq(s.syncJobs.id, id));
        out[id] = { status: "failed", jobId: id, error: msg };
      }
    }
  } catch (e) {
    const msg = safeMessage(e);
    for (const id of ids) {
      if (out[id]) continue;
      await db.update(s.syncJobs).set({ status: "failed", attempts: sql`${s.syncJobs.attempts} + 1`, lastError: msg, updatedAt: new Date().toISOString() }).where(eq(s.syncJobs.id, id));
      out[id] = { status: "failed", jobId: id, error: msg };
    }
  } finally {
    await releaseLock(db);
  }
  return out;
}

function safeMessage(e: unknown): string {
  if (e instanceof SheetsError) return e.message.slice(0, 500);
  if (e instanceof Error) return e.message.replace(/Bearer\s+\S+/g, "Bearer [redacted]").slice(0, 500);
  return "Unknown error";
}

const LOCK_KEY = "lock:sheets-sync";
async function acquireLock(db: DB): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const until = now + 120;
  const rows = await db
    .insert(s.rateLimits)
    .values({ key: LOCK_KEY, windowStart: until, count: 1 })
    .onConflictDoUpdate({ target: s.rateLimits.key, set: { windowStart: until }, setWhere: lt(s.rateLimits.windowStart, now) })
    .returning();
  return rows.length > 0 && rows[0].windowStart === until;
}
async function releaseLock(db: DB) {
  await db.update(s.rateLimits).set({ windowStart: 0 }).where(eq(s.rateLimits.key, LOCK_KEY));
}

// -------------------------------------------------------------- Writers ---

async function performJob(db: DB, api: SheetsApi, entity: SyncEntity, id: string) {
  switch (entity) {
    case "client":
      return upsertRows(api, TABS.clients, [await buildClientRow(db, id)]);
    case "audit": {
      const [a] = await db.select().from(s.audits).where(eq(s.audits.id, id));
      if (!a) throw new Error(`Audit ${id} not found`);
      await upsertRows(api, TABS.clients, [await buildClientRow(db, a.clientId)]);
      return upsertRows(api, TABS.audits, [await buildAuditRow(db, a)]);
    }
    case "recommendations": {
      const recs = await db.select().from(s.recommendations).where(eq(s.recommendations.auditId, id));
      return upsertRows(
        api,
        TABS.recommendations,
        recs.map((x) => recommendationRow({ ...x })),
      );
    }
    case "quote": {
      const [q] = await db.select().from(s.quotes).where(eq(s.quotes.id, id));
      if (!q) throw new Error(`Quotation ${id} not found`);
      await upsertRows(api, TABS.clients, [await buildClientRow(db, q.clientId)]);
      const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
      const link = q.publicToken && base ? `${base}/q/${q.publicToken}` : base ? `${base}/quotes/${q.id}` : "";
      await upsertRows(api, TABS.quotes, [
        quoteRow({ id: q.id, version: q.version, clientId: q.clientId, auditId: q.auditId, issueDate: q.issueDate, validUntil: q.validUntil, totals: q.totals as QuoteTotals, status: q.status, link, number: q.number }),
      ]);
      return upsertRows(api, TABS.quoteItems, quoteItemRows(q.id, q.doc as QuoteDoc, q.totals as QuoteTotals), { replaceGroupColumn: 0, replaceGroupValue: q.id });
    }
    case "catalogue": {
      const [services, offers, links, industries] = await Promise.all([db.select().from(s.services), db.select().from(s.offers), db.select().from(s.serviceLinks), db.select().from(s.industries)]);
      const linkName = new Map(links.map((l) => [l.id, l.name]));
      const indName = new Map(industries.map((i) => [i.id, i.name]));
      return upsertRows(
        api,
        TABS.catalogue,
        catalogueRows(
          services.map((x) => ({ ...x, linkName: linkName.get(x.linkId) ?? x.linkId, industryNames: x.industryIds.map((i) => indName.get(i) ?? i) })),
          offers.map((o) => ({ ...o, audience: o.audienceLabel })),
        ),
      );
    }
  }
}

async function buildClientRow(db: DB, clientId: string): Promise<Cell[]> {
  const [c] = await db.select().from(s.clients).where(eq(s.clients.id, clientId));
  if (!c) throw new Error(`Client ${clientId} not found`);
  const [ind] = c.industryId ? await db.select().from(s.industries).where(eq(s.industries.id, c.industryId)) : [];
  return clientRow({ ...c, industryName: ind?.name ?? "", lastActivity: c.lastContactAt ?? c.updatedAt });
}

async function buildAuditRow(db: DB, a: typeof s.audits.$inferSelect): Promise<Cell[]> {
  const [items, cats, inds] = await Promise.all([db.select().from(s.auditItems), db.select().from(s.auditCategories), db.select().from(s.industries)]);
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const all = [...items.map((i) => ({ id: i.id, label: i.label, categoryId: i.categoryId })), ...a.customItems];
  const goalLabel = new Map(BUSINESS_GOALS.map((g) => [g.id as string, g.label as string]));
  return auditRow({
    id: a.id,
    clientId: a.clientId,
    date: a.createdAt.slice(0, 10),
    industryName: inds.find((i) => i.id === a.industryId)?.name ?? "",
    goals: [...a.goals.map((g) => goalLabel.get(g) ?? g), ...(a.goalNotes ? [a.goalNotes] : [])],
    status: a.status,
    consultantNotes: a.consultantNotes,
    items: all.map((i) => {
      const r = a.responses[i.id];
      return { category: catName.get(i.categoryId) ?? i.categoryId, label: i.label, status: r?.status ?? "not_assessed", notes: r?.notes, confirmedByClient: r?.confirmedByClient };
    }),
  });
}

// ---------------------------------------------------------- Sheet layer ---

const quoteTab = (name: string) => `'${name.replace(/'/g, "''")}'`;
const colLetter = (n: number) => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

let tabsReady: Map<string, number> | null = null;
export function resetSheetCache() {
  tabsReady = null;
}

/** Creates missing tabs and writes header rows. Cached per process once confirmed. */
export async function ensureTabs(api: SheetsApi): Promise<Map<string, number>> {
  if (tabsReady) return tabsReady;
  const meta = await api<{ sheets: { properties: { sheetId: number; title: string } }[] }>("?fields=sheets.properties(sheetId,title)");
  const ids = new Map(meta.sheets.map((x) => [x.properties.title, x.properties.sheetId]));
  const missing = Object.values(TABS).filter((t) => !ids.has(t.name));
  if (missing.length) {
    const res = await api<{ replies: { addSheet: { properties: { sheetId: number; title: string } } }[] }>(":batchUpdate", {
      method: "POST",
      body: { requests: missing.map((t) => ({ addSheet: { properties: { title: t.name, gridProperties: { frozenRowCount: 1 } } } })) },
    });
    for (const r of res.replies) ids.set(r.addSheet.properties.title, r.addSheet.properties.sheetId);
  }
  const headerRanges = Object.values(TABS).map((t) => `${quoteTab(t.name)}!A1:${colLetter(t.headers.length)}1`);
  const current = await api<{ valueRanges: { values?: string[][] }[] }>(`/values:batchGet?${headerRanges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&")}`);
  const updates = Object.values(TABS)
    .map((t, i) => ({ t, row: current.valueRanges[i]?.values?.[0] ?? [] }))
    .filter(({ t, row }) => t.headers.some((h, j) => row[j] !== h))
    .map(({ t }) => ({ range: `${quoteTab(t.name)}!A1:${colLetter(t.headers.length)}1`, values: [t.headers] }));
  if (updates.length) await api("/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data: updates } });
  tabsReady = ids;
  return ids;
}

/**
 * Insert-or-update rows by key columns. With replaceGroup*, existing rows in
 * that group whose key is no longer present are deleted (draft line removed).
 */
export async function upsertRows(api: SheetsApi, tab: TabDef, rows: Cell[][], opts: { replaceGroupColumn?: number; replaceGroupValue?: string } = {}) {
  const ids = await ensureTabs(api);
  const width = colLetter(tab.headers.length);
  const existing = await api<{ values?: string[][] }>(`/values/${encodeURIComponent(`${quoteTab(tab.name)}!A2:${width}`)}?valueRenderOption=UNFORMATTED_VALUE`);
  const values = existing.values ?? [];
  const keyOf = (row: (string | number | boolean | undefined)[]) => tab.keyColumns.map((c) => String(row[c] ?? "")).join("\u0001");
  const index = new Map<string, number>();
  values.forEach((row, i) => {
    const k = keyOf(row);
    if (k.replace(/\u0001/g, "") && !index.has(k)) index.set(k, i + 2); // sheet row number
  });

  const updates: { range: string; values: Cell[][] }[] = [];
  const appends: Cell[][] = [];
  const newKeys = new Set<string>();
  for (const row of rows) {
    const k = keyOf(row);
    newKeys.add(k);
    const at = index.get(k);
    if (at) updates.push({ range: `${quoteTab(tab.name)}!A${at}:${width}${at}`, values: [row] });
    else appends.push(row);
  }
  if (updates.length) await api("/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data: updates } });
  if (appends.length) {
    await api(`/values/${encodeURIComponent(`${quoteTab(tab.name)}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      body: { values: appends },
    });
  }
  if (opts.replaceGroupColumn !== undefined && opts.replaceGroupValue !== undefined) {
    const stale = values
      .map((row, i) => ({ row, n: i + 2 }))
      .filter(({ row }) => String(row[opts.replaceGroupColumn!] ?? "") === opts.replaceGroupValue && !newKeys.has(keyOf(row)))
      .map(({ n }) => n)
      .sort((a, b) => b - a);
    if (stale.length) {
      await api(":batchUpdate", {
        method: "POST",
        body: { requests: stale.map((n) => ({ deleteDimension: { range: { sheetId: ids.get(tab.name), dimension: "ROWS", startIndex: n - 1, endIndex: n } } })) },
      });
    }
  }
}
