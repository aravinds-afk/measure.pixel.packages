import "server-only";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { computeTotals, MODEL_FIELDS, type QuoteTotals } from "@/lib/pricing";
import { quoteDocSchema, type LineItem, type QuoteDoc, type QuoteStatus } from "@/lib/quote-schema";
import { newId, newToken } from "@/lib/ids";
import type { CurrentUser } from "../auth";
import type { DB } from "../db";
import * as s from "../db/schema";
import { HttpError } from "../http";
import type { Settings } from "../settings";

export type QuoteRow = typeof s.quotes.$inferSelect;

/** Status transitions. Drafts are editable; everything else is a frozen snapshot. */
const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["presented", "sent"],
  presented: ["sent", "accepted", "rejected"],
  sent: ["presented", "accepted", "rejected"],
  accepted: [],
  rejected: [],
  expired: [],
};

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Presented/sent quotations past their validity date read as expired. */
export function effectiveStatus(q: Pick<QuoteRow, "status" | "validUntil">, on = today()): QuoteStatus {
  if ((q.status === "presented" || q.status === "sent") && q.validUntil && q.validUntil < on) return "expired";
  return q.status;
}

// ------------------------------------------------------------ Validation ---

type CatalogPrices = {
  offers: Map<string, typeof s.offers.$inferSelect>;
  services: Map<string, typeof s.services.$inferSelect>;
};

async function loadPrices(db: DB): Promise<CatalogPrices> {
  const [offers, services] = await Promise.all([db.select().from(s.offers), db.select().from(s.services)]);
  return { offers: new Map(offers.map((o) => [o.id, o])), services: new Map(services.map((x) => [x.id, x])) };
}

/**
 * Server-side commercial checks. Returns a doc with delivery costs taken from
 * the catalogue (consultants never see or set them).
 */
export function enforcePermissions(doc: QuoteDoc, prices: CatalogPrices, user: CurrentUser, settings: Settings, previous: QuoteDoc | null): QuoteDoc {
  const violations: string[] = [];
  const prevItems = new Map((previous?.items ?? []).map((i) => [i.id, i]));
  const items: LineItem[] = doc.items.map((item) => {
    const f = MODEL_FIELDS[item.billingModel];
    let next = { ...item };
    if (item.kind === "offer") {
      const o = item.offerId ? prices.offers.get(item.offerId) : undefined;
      if (!o) violations.push(`${item.name}: packaged offer not found in catalogue`);
      else {
        const upfront = item.billingModel === "setup_plus_monthly" ? item.setupFee : item.unitPrice;
        const outUp = o.upfrontIncluded ? upfront !== 0 : o.upfrontMin != null && (upfront < o.upfrontMin || upfront > (o.upfrontMax ?? o.upfrontMin));
        const outMon = o.monthlyMin != null && f.monthlyFee && (item.monthlyFee < o.monthlyMin || item.monthlyFee > (o.monthlyMax ?? o.monthlyMin));
        if ((outUp || outMon) && !user.canOverridePrices) violations.push(`${item.name}: price outside the board band needs price-override permission`);
        next = { ...next, deliveryCostOneTime: o.deliveryCostOneTime, deliveryCostMonthly: o.deliveryCostMonthly };
      }
    } else if (item.kind === "service") {
      const svc = item.serviceId ? prices.services.get(item.serviceId) : undefined;
      if (!svc) violations.push(`${item.name}: service not found in catalogue`);
      else {
        const opt = item.optionId ? svc.priceOptions.find((o) => o.id === item.optionId) : undefined;
        if (opt) {
          const changed =
            (f.unitPrice && (opt.unitPrice ?? 0) !== item.unitPrice) ||
            (f.setupFee && (opt.setupFee ?? 0) !== item.setupFee) ||
            (f.monthlyFee && (opt.monthlyFee ?? 0) !== item.monthlyFee) ||
            (f.annualFee && (opt.annualFee ?? 0) !== item.annualFee) ||
            opt.model !== item.billingModel;
          if (changed && !user.canOverridePrices) violations.push(`${item.name}: changing a configured price needs price-override permission`);
        }
        next = { ...next, deliveryCostOneTime: svc.deliveryCostOneTime, deliveryCostMonthly: svc.deliveryCostMonthly };
      }
    } else if (user.role !== "admin") {
      const prev = prevItems.get(item.id);
      next = { ...next, deliveryCostOneTime: prev?.deliveryCostOneTime ?? 0, deliveryCostMonthly: prev?.deliveryCostMonthly ?? 0 };
    }
    return next;
  });
  const out = { ...doc, items };
  const totals = computeTotals(out);
  if (user.role !== "admin" && totals.effectiveDiscountPercent > settings.pricing.consultantMaxDiscountPercent + 1e-9) {
    violations.push(`Discount of ${totals.effectiveDiscountPercent.toFixed(1)}% exceeds the ${settings.pricing.consultantMaxDiscountPercent}% consultant limit — an admin must authorise it`);
  }
  if (out.discount && out.discount.value > 0 && !out.discount.reason.trim()) violations.push("Give a reason for the discount");
  if (violations.length) throw new HttpError(403, violations[0], { violations });
  return out;
}

/** What a consultant's browser receives: delivery costs removed. */
export function docForUser(doc: QuoteDoc, user: CurrentUser): QuoteDoc {
  if (user.role === "admin") return doc;
  return { ...doc, items: doc.items.map((i) => ({ ...i, deliveryCostOneTime: 0, deliveryCostMonthly: 0 })) };
}

export function totalsForUser(t: QuoteTotals, user: CurrentUser): QuoteTotals {
  if (user.role === "admin") return t;
  return {
    ...t,
    internal: { deliveryCostOneTime: 0, deliveryCostMonthly: 0, grossProfitOneTime: 0, grossProfitMonthly: 0, marginOneTimePercent: null, marginMonthlyPercent: null, costsConfigured: false },
  };
}

// -------------------------------------------------------------- Writes ---

function moneyColumns(t: QuoteTotals) {
  return {
    oneTimeTotal: t.oneTimeTotal,
    monthlyTotal: t.monthlyTotal,
    annualTotal: t.annualTotal,
    oneTimeNet: t.oneTimeNet,
    monthlyNet: t.monthlyNet,
    annualNet: t.annualNet,
    discountTotal: t.discountOneTime + t.discountMonthly + t.discountAnnual,
    taxTotal: t.taxOneTime + t.taxMonthly + t.taxAnnual,
    initialPayment: t.initialPaymentDue,
    contractValue: t.estimatedContractValue,
  };
}

async function writeItems(db: DB, quoteId: string, doc: QuoteDoc, totals: QuoteTotals) {
  await db.delete(s.quoteItems).where(eq(s.quoteItems.quoteId, quoteId));
  if (!doc.items.length) return;
  await db.insert(s.quoteItems).values(
    doc.items.map((it, i) => ({
      id: `${quoteId}-${i + 1}`,
      quoteId,
      position: i + 1,
      kind: it.kind,
      offerId: it.offerId,
      serviceId: it.serviceId,
      nameSnapshot: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      billingModel: it.billingModel,
      setupFee: it.setupFee,
      recurringFee: it.monthlyFee,
      annualFee: it.annualFee,
      optional: it.optional,
      lineTotal: totals.lines[i].lineTotal,
      notes: it.notes,
    })),
  );
}

async function nextNumber(db: DB, prefix: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const stem = `${prefix}-${year}-`;
  const [row] = await db
    .select({ n: sql<number>`max(cast(substr(${s.quotes.number}, ${stem.length + 1}) as integer))` })
    .from(s.quotes)
    .where(like(s.quotes.number, `${stem}%`));
  return `${stem}${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}

/** Creates version 1 of a new quotation. Same idempotency key ⇒ same quotation. */
export async function createQuote(
  db: DB,
  user: CurrentUser,
  settings: Settings,
  input: { clientId: string; auditId: string | null; doc: QuoteDoc; idempotencyKey: string },
): Promise<{ quote: QuoteRow; created: boolean }> {
  const [dupe] = await db.select().from(s.quotes).where(eq(s.quotes.idempotencyKey, input.idempotencyKey));
  if (dupe) return { quote: dupe, created: false };
  const doc = enforcePermissions(quoteDocSchema.parse(input.doc), await loadPrices(db), user, settings, null);
  const totals = computeTotals(doc);
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newId("QT");
    try {
      const quote = await db.transaction(async (tx) => {
        const number = await nextNumber(tx as unknown as DB, settings.quote.numberPrefix);
        const [q] = await tx
          .insert(s.quotes)
          .values({ id, number, rootId: id, version: 1, clientId: input.clientId, auditId: input.auditId, status: "draft", doc, totals, ...moneyColumns(totals), idempotencyKey: input.idempotencyKey, createdBy: user.id })
          .returning();
        await writeItems(tx as unknown as DB, id, doc, totals);
        return q;
      });
      return { quote, created: true };
    } catch (e) {
      const [again] = await db.select().from(s.quotes).where(eq(s.quotes.idempotencyKey, input.idempotencyKey));
      if (again) return { quote: again, created: false };
      if (attempt === 2) throw e;
    }
  }
  throw new HttpError(500, "Could not create quotation");
}

export async function getQuote(db: DB, id: string): Promise<QuoteRow> {
  const [q] = await db.select().from(s.quotes).where(eq(s.quotes.id, id));
  if (!q) throw new HttpError(404, "Quotation not found");
  return q;
}

/** Saves a draft. Optimistic concurrency via rev; server recomputes totals and checks the client's figures. */
export async function saveDraft(
  db: DB,
  user: CurrentUser,
  settings: Settings,
  id: string,
  input: { doc: QuoteDoc; rev: number; expectedTotals?: { oneTimeTotal: number; monthlyTotal: number; annualTotal: number; initialPaymentDue: number } },
) {
  const q = await getQuote(db, id);
  if (q.status !== "draft") throw new HttpError(409, "This quotation has been issued and is locked. Create a revision to change it.");
  if (q.rev !== input.rev) throw new HttpError(409, "This quotation was changed elsewhere. Reload to see the latest version.");
  const doc = enforcePermissions(quoteDocSchema.parse(input.doc), await loadPrices(db), user, settings, q.doc as QuoteDoc);
  const totals = computeTotals(doc);
  if (input.expectedTotals) {
    const e = input.expectedTotals;
    if (e.oneTimeTotal !== totals.oneTimeTotal || e.monthlyTotal !== totals.monthlyTotal || e.annualTotal !== totals.annualTotal || e.initialPaymentDue !== totals.initialPaymentDue) {
      throw new HttpError(409, "Totals did not match the server calculation. Nothing was saved — reload and try again.", { serverTotals: totals });
    }
  }
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(s.quotes)
      .set({ doc, totals, ...moneyColumns(totals), rev: q.rev + 1, updatedAt: new Date().toISOString() })
      .where(and(eq(s.quotes.id, id), eq(s.quotes.rev, input.rev), eq(s.quotes.status, "draft")))
      .returning();
    if (!row) throw new HttpError(409, "This quotation was changed elsewhere. Reload to see the latest version.");
    await writeItems(tx as unknown as DB, id, doc, totals);
    return row;
  });
  return updated;
}

/** Compare-and-set status change; repeating the same request is a no-op. */
export async function changeStatus(db: DB, user: CurrentUser, id: string, input: { from: QuoteStatus; to: QuoteStatus }) {
  const q = await getQuote(db, id);
  if (q.status === input.to) return q; // duplicate click
  const current = effectiveStatus(q);
  if (q.status !== input.from) throw new HttpError(409, `Quotation is now ${q.status}; reload before changing status.`);
  if (current === "expired" && input.to === "accepted") throw new HttpError(409, "This quotation has expired. Create a revision with new dates.");
  if (!TRANSITIONS[q.status].includes(input.to)) throw new HttpError(409, `Cannot move a ${q.status} quotation to ${input.to}`);
  const doc = q.doc as QuoteDoc;
  const set: Partial<typeof s.quotes.$inferInsert> = { status: input.to, statusChangedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), rev: q.rev + 1 };
  if (q.status === "draft") {
    const totals = computeTotals(doc);
    if (totals.issues.length) throw new HttpError(422, `Fix before issuing: ${totals.issues[0]}`, { issues: totals.issues });
    if (!doc.client.businessName.trim()) throw new HttpError(422, "Add the client's business name before issuing");
    const issue = today();
    set.issueDate = issue;
    set.validUntil = addDays(issue, doc.validityDays);
  }
  const [row] = await db
    .update(s.quotes)
    .set(set)
    .where(and(eq(s.quotes.id, id), eq(s.quotes.status, input.from)))
    .returning();
  if (!row) return getQuote(db, id);
  await db.update(s.clients).set({ lastContactAt: new Date().toISOString() }).where(eq(s.clients.id, q.clientId));
  void user;
  return row;
}

/** New draft version of an existing quotation. The source version is never modified. */
export async function reviseQuote(db: DB, user: CurrentUser, id: string, idempotencyKey: string) {
  const [dupe] = await db.select().from(s.quotes).where(eq(s.quotes.idempotencyKey, idempotencyKey));
  if (dupe) return dupe;
  const src = await getQuote(db, id);
  const [latest] = await db.select().from(s.quotes).where(eq(s.quotes.rootId, src.rootId)).orderBy(desc(s.quotes.version)).limit(1);
  if (latest.status === "draft") throw new HttpError(409, `Version ${latest.version} is still a draft — edit that instead.`, { draftId: latest.id });
  const newIdValue = newId("QT");
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(s.quotes)
      .values({
        id: newIdValue,
        number: src.number,
        rootId: src.rootId,
        version: latest.version + 1,
        clientId: src.clientId,
        auditId: src.auditId,
        status: "draft",
        doc: src.doc,
        totals: src.totals,
        ...moneyColumns(src.totals as QuoteTotals),
        idempotencyKey,
        createdBy: user.id,
      })
      .returning();
    await writeItems(tx as unknown as DB, newIdValue, src.doc as QuoteDoc, src.totals as QuoteTotals);
    return row;
  });
}

export async function setShareLink(db: DB, id: string, enabled: boolean) {
  const q = await getQuote(db, id);
  if (enabled && q.status === "draft") throw new HttpError(409, "Issue the quotation before sharing a link");
  const token = enabled ? q.publicToken ?? newToken() : null;
  const [row] = await db.update(s.quotes).set({ publicToken: token, updatedAt: new Date().toISOString() }).where(eq(s.quotes.id, id)).returning();
  return row;
}

export async function versionsOf(db: DB, rootId: string) {
  return db.select().from(s.quotes).where(eq(s.quotes.rootId, rootId)).orderBy(desc(s.quotes.version));
}
