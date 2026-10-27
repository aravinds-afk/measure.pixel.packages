import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { consultant, testDb } from "./helpers";
import { fakeSheets } from "./fake-sheets";
import * as s from "@/server/db/schema";
import type { DB } from "@/server/db";
import { getSettings } from "@/server/settings";
import { saveRecommendations, startAudit, updateAudit } from "@/server/services/audits";
import { docFromAudit } from "@/server/services/quote-from-audit";
import { createQuote, saveDraft } from "@/server/services/quotes";
import { processPending, resetSheetCache, syncNow } from "@/server/sheets/sync";
import type { QuoteDoc } from "@/lib/quote-schema";

let db: DB;
let close: () => void;
let quoteId = "";
let auditId = "";
beforeAll(async () => {
  ({ db, close } = await testDb());
  const a = await startAudit(db, consultant, { website: "", businessName: "=HYPERLINK(\"x\")", instagram: "", linkedin: "", youtube: "", otherLinks: [], idempotencyKey: "sheets-audit-1" });
  auditId = a.id;
  await updateAudit(db, a.id, { rev: a.rev, industryId: "ca-cfo-firms", responses: { "pa-google-ads": { status: "missing" }, "lc-call-tracking": { status: "missing" }, "wc-landing-pages": { status: "missing" } }, goals: ["more-enquiries"] });
  await saveRecommendations(db, a.id, {});
  const settings = await getSettings(db);
  const { doc, clientId } = await docFromAudit(db, settings, a.id);
  quoteId = (await createQuote(db, consultant, settings, { clientId, auditId: a.id, doc, idempotencyKey: "sheets-quote-1" })).quote.id;
});
afterAll(() => close());
beforeEach(() => resetSheetCache());

describe("Google Sheets sync", () => {
  it("reports not_configured without credentials and never claims success", async () => {
    const r = await syncNow(db, "quote", quoteId, undefined);
    expect(r.status).toBe("not_configured");
    const [job] = await db.select().from(s.syncJobs).where(eq(s.syncJobs.id, r.jobId!));
    expect(job.status).toBe("pending");
  });

  it("creates tabs with headers and writes quote + items + client", async () => {
    const sheet = fakeSheets();
    const r = await syncNow(db, "quote", quoteId, sheet.api);
    expect(r.status).toBe("synced");
    expect([...sheet.tabs.keys()]).toEqual(["Clients", "Brand Audits", "Recommendations", "Quotations", "Quotation Items", "Service Catalogue"]);
    expect(sheet.tabs.get("Quotations")!.rows.length).toBe(2);
    expect(sheet.tabs.get("Clients")!.rows[1][1]).toBe("=HYPERLINK(\"x\")"); // stored as RAW text
    const items = sheet.tabs.get("Quotation Items")!.rows.slice(1);
    expect(items.length).toBeGreaterThan(0);

    // Re-running (retry) updates in place — no duplicates.
    resetSheetCache();
    await syncNow(db, "quote", quoteId, sheet.api);
    expect(sheet.tabs.get("Quotations")!.rows.length).toBe(2);
    expect(sheet.tabs.get("Quotation Items")!.rows.length - 1).toBe(items.length);

    // Removing a draft line deletes its row.
    const [q] = await db.select().from(s.quotes).where(eq(s.quotes.id, quoteId));
    const doc = structuredClone(q.doc) as QuoteDoc;
    doc.items = doc.items.slice(0, 1);
    await saveDraft(db, consultant, await getSettings(db), quoteId, { doc, rev: q.rev });
    resetSheetCache();
    await syncNow(db, "quote", quoteId, sheet.api);
    expect(sheet.tabs.get("Quotation Items")!.rows.length - 1).toBe(1);
  });

  it("marks failures, then retries successfully", async () => {
    const sheet = fakeSheets({ failOnce: /^\/values\// });
    const first = await syncNow(db, "audit", auditId, sheet.api);
    expect(first.status).toBe("failed");
    expect(first.error).toMatch(/Simulated/);
    resetSheetCache();
    const out = await processPending(db, sheet.api);
    expect(Object.values(out).some((o) => o.status === "synced")).toBe(true);
    expect(sheet.tabs.get("Brand Audits")!.rows.length).toBe(2);
    const row = sheet.tabs.get("Brand Audits")!.rows[1];
    expect(String(row[5])).toContain("Missing");
  });

  it("syncs recommendations and catalogue", async () => {
    const sheet = fakeSheets();
    expect((await syncNow(db, "recommendations", auditId, sheet.api)).status).toBe("synced");
    expect((await syncNow(db, "catalogue", "all", sheet.api)).status).toBe("synced");
    expect(sheet.tabs.get("Service Catalogue")!.rows.length).toBe(1 + 32 + 14);
    expect(sheet.tabs.get("Recommendations")!.rows.length).toBeGreaterThan(1);
  });
});
