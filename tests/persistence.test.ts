import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { admin, consultant, testDb } from "./helpers";
import * as s from "@/server/db/schema";
import { getSettings } from "@/server/settings";
import { applyDiscovery, saveRecommendations, startAudit, updateAudit } from "@/server/services/audits";
import { docFromAudit } from "@/server/services/quote-from-audit";
import { changeStatus, createQuote, effectiveStatus, reviseQuote, saveDraft, versionsOf } from "@/server/services/quotes";
import { computeTotals } from "@/lib/pricing";
import type { QuoteDoc } from "@/lib/quote-schema";
import type { DB } from "@/server/db";

let db: DB;
let close: () => void;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

describe("catalogue seed", () => {
  it("seeds the board counts and is idempotent without clobbering edits", async () => {
    expect((await db.select().from(s.services)).length).toBe(32);
    expect((await db.select().from(s.industries)).length).toBe(44);
    expect((await db.select().from(s.offers)).length).toBe(14);
    await db.update(s.offers).set({ monthlyMin: 1 }).where(eq(s.offers.id, "measurement-retainer"));
    const { seedCatalog } = await import("@/server/seed");
    await seedCatalog(db);
    const [o] = await db.select().from(s.offers).where(eq(s.offers.id, "measurement-retainer"));
    expect(o.monthlyMin).toBe(1);
    expect((o.sourceSnapshot as { monthly: { min: number } }).monthly.min).toBe(15000);
    await db.update(s.offers).set({ monthlyMin: 15_000_00 }).where(eq(s.offers.id, "measurement-retainer"));
  });
});

describe("audit → quotation workflow", () => {
  let auditId = "";
  let quoteId = "";

  it("starts an audit idempotently", async () => {
    const a1 = await startAudit(db, consultant, { website: "smile.example.com", businessName: "Smile Dental", instagram: "", linkedin: "", youtube: "", otherLinks: [], idempotencyKey: "key-audit-0001" });
    const a2 = await startAudit(db, consultant, { website: "smile.example.com", businessName: "Smile Dental", instagram: "", linkedin: "", youtube: "", otherLinks: [], idempotencyKey: "key-audit-0001" });
    expect(a1.id).toBe(a2.id);
    expect((await db.select().from(s.clients)).length).toBe(1);
    auditId = a1.id;
  });

  it("records findings with optimistic concurrency", async () => {
    const [a] = await db.select().from(s.audits).where(eq(s.audits.id, auditId));
    const updated = await updateAudit(db, auditId, {
      rev: a.rev,
      industryId: "dental-clinics",
      goals: ["more-enquiries"],
      responses: {
        "pa-google-ads": { status: "missing", source: "consultant" },
        "wc-landing-pages": { status: "missing", source: "consultant" },
        "an-conversions": { status: "missing", source: "consultant", confirmedByClient: true },
        "lc-whatsapp": { status: "working_well", source: "consultant" },
      },
    });
    expect(updated.rev).toBe(a.rev + 1);
    await expect(updateAudit(db, auditId, { rev: a.rev, goalNotes: "stale" })).rejects.toThrow(/changed in another window/);
    expect(applyDiscovery(updated.responses, { prefill: [{ itemId: "lc-whatsapp", status: "missing", suggestion: null, evidence: "" }] } as never)["lc-whatsapp"].status).toBe("working_well");
  });

  it("saves recommendations and builds a quote from accepted ones", async () => {
    const rows = await saveRecommendations(db, auditId, {});
    const clinic = rows.find((r) => r.offerId === "clinic-patient-engine")!;
    expect(clinic.decision).toBe("accepted");
    expect(clinic.recommendedPrice).toContain("₹40–60K");
    const settings = await getSettings(db);
    const { doc, clientId } = await docFromAudit(db, settings, auditId);
    const line = doc.items.find((i) => i.offerId === "clinic-patient-engine")!;
    expect(line.setupFee).toBe(40_000_00);
    expect(line.deliverables.find((d) => d.label === "WhatsApp intake")!.included).toBe(false);
    const { quote, created } = await createQuote(db, consultant, settings, { clientId, auditId, doc, idempotencyKey: "key-quote-0001" });
    expect(created).toBe(true);
    expect(quote.number).toMatch(/^MPQ-\d{4}-0001$/);
    const again = await createQuote(db, consultant, settings, { clientId, auditId, doc, idempotencyKey: "key-quote-0001" });
    expect(again.created).toBe(false);
    expect(again.quote.id).toBe(quote.id);
    expect((await db.select().from(s.quotes)).length).toBe(1);
    quoteId = quote.id;
  });

  it("rejects out-of-band prices and over-limit discounts for consultants", async () => {
    const settings = await getSettings(db);
    const [q] = await db.select().from(s.quotes).where(eq(s.quotes.id, quoteId));
    const doc = structuredClone(q.doc) as QuoteDoc;
    const line = doc.items.find((i) => i.offerId === "clinic-patient-engine")!;
    line.monthlyFee = 80_000_00;
    await expect(saveDraft(db, consultant, settings, quoteId, { doc, rev: q.rev })).rejects.toThrow(/price-override/);
    line.monthlyFee = 45_000_00;
    doc.discount = { type: "percent", value: 25, appliesTo: "both", reason: "x" };
    await expect(saveDraft(db, consultant, settings, quoteId, { doc, rev: q.rev })).rejects.toThrow(/consultant limit/);
    doc.discount = { type: "percent", value: 5, appliesTo: "recurring", reason: "BNI" };
    const t = computeTotals(doc);
    await expect(
      saveDraft(db, consultant, settings, quoteId, { doc, rev: q.rev, expectedTotals: { oneTimeTotal: 1, monthlyTotal: t.monthlyTotal, annualTotal: t.annualTotal, initialPaymentDue: t.initialPaymentDue } }),
    ).rejects.toThrow(/did not match/);
    const saved = await saveDraft(db, consultant, settings, quoteId, { doc, rev: q.rev, expectedTotals: { oneTimeTotal: t.oneTimeTotal, monthlyTotal: t.monthlyTotal, annualTotal: t.annualTotal, initialPaymentDue: t.initialPaymentDue } });
    expect(saved.monthlyNet).toBe(t.monthlyNet);
    expect(saved.monthlyTotal).toBe(t.monthlyTotal);
    // Admin may go outside the band.
    const doc2 = structuredClone(saved.doc) as QuoteDoc;
    doc2.items.find((i) => i.offerId === "clinic-patient-engine")!.monthlyFee = 80_000_00;
    // Remove unpriced supporting services so the quote can be issued.
    doc2.items = doc2.items.filter((i) => i.kind === "offer");
    const s2 = await saveDraft(db, admin, settings, quoteId, { doc: doc2, rev: saved.rev });
    expect((s2.doc as QuoteDoc).items[0].monthlyFee).toBe(80_000_00);
    const items = await db.select().from(s.quoteItems).where(eq(s.quoteItems.quoteId, quoteId));
    expect(items.length).toBe(1);
  });

  it("issues, locks, revises without touching the original, and accepts", async () => {
    const issued = await changeStatus(db, consultant, quoteId, { from: "draft", to: "presented" });
    expect(issued.issueDate).toBeTruthy();
    expect(issued.validUntil! > issued.issueDate!).toBe(true);
    const dup = await changeStatus(db, consultant, quoteId, { from: "draft", to: "presented" });
    expect(dup.status).toBe("presented");
    const settings = await getSettings(db);
    await expect(saveDraft(db, consultant, settings, quoteId, { doc: issued.doc as QuoteDoc, rev: issued.rev })).rejects.toThrow(/locked/);

    const v2 = await reviseQuote(db, consultant, quoteId, "key-revise-0001");
    const v2again = await reviseQuote(db, consultant, quoteId, "key-revise-0001");
    expect(v2again.id).toBe(v2.id);
    expect(v2.version).toBe(2);
    expect(v2.number).toBe(issued.number);
    const d = structuredClone(v2.doc) as QuoteDoc;
    d.items[0].monthlyFee = 40_000_00;
    await saveDraft(db, consultant, settings, v2.id, { doc: d, rev: v2.rev });
    const [orig] = await db.select().from(s.quotes).where(eq(s.quotes.id, quoteId));
    expect((orig.doc as QuoteDoc).items[0].monthlyFee).toBe(80_000_00);
    expect((await versionsOf(db, issued.rootId)).length).toBe(2);
    await expect(reviseQuote(db, consultant, quoteId, "key-revise-0002")).rejects.toThrow(/still a draft/);

    await changeStatus(db, consultant, v2.id, { from: "draft", to: "sent" });
    const acc = await changeStatus(db, consultant, v2.id, { from: "sent", to: "accepted" });
    expect(acc.status).toBe("accepted");
    await expect(changeStatus(db, consultant, v2.id, { from: "accepted", to: "rejected" })).rejects.toThrow();
  });

  it("derives expiry from validity", () => {
    expect(effectiveStatus({ status: "sent", validUntil: "2020-01-01" })).toBe("expired");
    expect(effectiveStatus({ status: "accepted", validUntil: "2020-01-01" })).toBe("accepted");
  });
});
