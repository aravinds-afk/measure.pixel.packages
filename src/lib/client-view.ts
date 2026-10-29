import { clientTotals, computeTotals, type ClientTotals } from "./pricing";
import type { QuoteDoc, QuoteStatus } from "./quote-schema";

/**
 * The only shape that client mode, public links and PDFs render. Built from
 * an explicit allowlist — internal notes, delivery costs, margins, price
 * sources and recommendation rationale cannot leak through it.
 */
export type ClientQuoteView = {
  number: string;
  version: number;
  status: QuoteStatus;
  issueDate: string | null;
  validUntil: string | null;
  company: { name: string; email: string; phone: string; website: string; address: string; gstin: string };
  client: QuoteDoc["client"];
  summary: QuoteDoc["summary"];
  items: {
    id: string;
    name: string;
    description: string;
    deliverables: string[];
    billingModel: QuoteDoc["items"][number]["billingModel"];
    quantity: number;
    unitLabel: string;
    unitPrice: number;
    setupFee: number;
    upfrontLabel: "Setup" | "Project";
    monthlyFee: number;
    annualFee: number;
    termMonths: number | null;
    optional: boolean;
    notes: string;
  }[];
  discount: { type: "percent" | "amount"; value: number; appliesTo: "one_time" | "recurring" | "both"; reason: string } | null;
  tax: QuoteDoc["tax"];
  billing: QuoteDoc["billing"];
  terms: QuoteDoc["terms"];
  totals: ClientTotals;
};

export function toClientView(
  meta: { number: string; version: number; status: QuoteStatus; issueDate: string | null; validUntil: string | null },
  doc: QuoteDoc,
  company: ClientQuoteView["company"],
): ClientQuoteView {
  const totals = computeTotals(doc);
  return {
    number: meta.number,
    version: meta.version,
    status: meta.status,
    issueDate: meta.issueDate,
    validUntil: meta.validUntil,
    company: { name: company.name, email: company.email, phone: company.phone, website: company.website, address: company.address, gstin: company.gstin },
    client: {
      businessName: doc.client.businessName,
      contactPerson: doc.client.contactPerson,
      email: doc.client.email,
      phone: doc.client.phone,
      website: doc.client.website,
      industryName: doc.client.industryName,
    },
    summary: { needs: doc.summary.needs, solution: doc.summary.solution },
    items: doc.items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      deliverables: i.deliverables.filter((d) => d.included).map((d) => d.label),
      billingModel: i.billingModel,
      quantity: i.quantity,
      unitLabel: i.unitLabel,
      unitPrice: i.unitPrice,
      setupFee: i.setupFee,
      upfrontLabel: i.upfrontLabel,
      monthlyFee: i.monthlyFee,
      annualFee: i.annualFee,
      termMonths: i.termMonths,
      optional: i.optional,
      notes: i.notes,
    })),
    discount: doc.discount ? { type: doc.discount.type, value: doc.discount.value, appliesTo: doc.discount.appliesTo, reason: doc.discount.reason } : null,
    tax: { enabled: doc.tax.enabled, label: doc.tax.label, ratePercent: doc.tax.ratePercent },
    billing: { ...doc.billing },
    terms: { ...doc.terms },
    totals: clientTotals(totals),
  };
}
