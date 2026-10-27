import type { QuoteDoc } from "@/lib/quote-schema";
import type { QuoteTotals } from "@/lib/pricing";

/**
 * Pure mapping from canonical records to spreadsheet rows. Column order
 * follows the agreed tab layout; extra columns are appended at the end.
 * Money is written as rupee numbers. Rows are written with
 * valueInputOption=RAW so cell text is never interpreted as a formula.
 */

export type Cell = string | number | boolean;
export type TabDef = { name: string; headers: string[]; keyColumns: number[] };

export const TABS = {
  clients: { name: "Clients", headers: ["Client ID", "Business Name", "Website", "Industry", "Contact Person", "Phone", "Email", "Created Date", "Last Activity"], keyColumns: [0] },
  audits: {
    name: "Brand Audits",
    headers: ["Audit ID", "Client ID", "Audit Date", "Industry", "Business Goals", "Audit Findings", "Confirmed Gaps", "Unknown Items", "Consultant Notes", "Audit Status", "Structured Responses (JSON)"],
    keyColumns: [0],
  },
  recommendations: {
    name: "Recommendations",
    headers: ["Recommendation ID", "Audit ID", "Offer ID", "Service ID", "Recommendation Reason", "Priority", "Recommended Price", "Accepted / Removed / Deferred", "Consultant Override"],
    keyColumns: [0],
  },
  quotes: {
    name: "Quotations",
    headers: [
      "Quotation ID", "Version", "Client ID", "Audit ID", "Issue Date", "Valid Until", "One-Time Total", "Monthly Recurring Total", "Annual Recurring Total",
      "Discount", "Tax", "Initial Payment", "Estimated Contract Value", "Quotation Status", "PDF or Secure Link", "Quote Number", "Last Synced",
    ],
    keyColumns: [0],
  },
  quoteItems: {
    name: "Quotation Items",
    headers: ["Quotation ID", "Service ID", "Service Name Snapshot", "Quantity", "Unit Price Snapshot", "Billing Model", "Setup Fee", "Recurring Fee", "Optional Status", "Line Total", "Item Notes", "Line No", "Offer ID"],
    keyColumns: [0, 11],
  },
  catalogue: {
    name: "Service Catalogue",
    headers: ["Service ID", "Service Name", "Service Link", "Industry Relevance", "Pricing Model", "Default Price", "Setup Price", "Monthly Price", "Annual Price", "Delivery Cost", "Active Status", "Source"],
    keyColumns: [0],
  },
} satisfies Record<string, TabDef>;

const r = (paise: number | null | undefined): Cell => (paise == null ? "" : paise / 100);

export function clientRow(c: { id: string; businessName: string; website: string; industryName: string; contactPerson: string; phone: string; email: string; createdAt: string; lastActivity: string }): Cell[] {
  return [c.id, c.businessName, c.website, c.industryName, c.contactPerson, c.phone, c.email, c.createdAt, c.lastActivity];
}

export type AuditForSheet = {
  id: string;
  clientId: string;
  date: string;
  industryName: string;
  goals: string[];
  status: string;
  consultantNotes: string;
  items: { category: string; label: string; status: string; notes?: string; confirmedByClient?: boolean }[];
};

const STATUS_LABEL: Record<string, string> = {
  working_well: "Working Well",
  needs_improvement: "Needs Improvement",
  missing: "Missing",
  not_applicable: "Not Applicable",
  not_assessed: "Not Assessed",
};

export function auditRow(a: AuditForSheet): Cell[] {
  const assessed = a.items.filter((i) => i.status !== "not_assessed");
  const findings = assessed.map((i) => `${i.category} › ${i.label}: ${STATUS_LABEL[i.status] ?? i.status}${i.notes ? ` — ${i.notes}` : ""}`).join("\n");
  const confirmed = a.items.filter((i) => i.confirmedByClient && (i.status === "missing" || i.status === "needs_improvement")).map((i) => i.label).join("\n");
  const unknown = a.items.filter((i) => i.status === "not_assessed").map((i) => i.label).join("\n");
  return [a.id, a.clientId, a.date, a.industryName, a.goals.join(", "), truncate(findings), truncate(confirmed), truncate(unknown), truncate(a.consultantNotes), a.status, truncate(JSON.stringify(a.items))];
}

export function recommendationRow(x: { id: string; auditId: string; offerId: string | null; serviceId: string | null; reason: string; priority: string; recommendedPrice: string; decision: string; consultantOverride: boolean }): Cell[] {
  return [x.id, x.auditId, x.offerId ?? "", x.serviceId ?? "", truncate(x.reason), x.priority, x.recommendedPrice, cap(x.decision), x.consultantOverride ? "Yes" : "No"];
}

export function quoteRow(q: {
  id: string; version: number; clientId: string; auditId: string | null; issueDate: string | null; validUntil: string | null;
  totals: QuoteTotals; status: string; link: string; number: string;
}): Cell[] {
  const t = q.totals;
  return [
    q.id, q.version, q.clientId, q.auditId ?? "", q.issueDate ?? "", q.validUntil ?? "",
    r(t.oneTimeTotal), r(t.monthlyTotal), r(t.annualTotal),
    r(t.discountOneTime + t.discountMonthly + t.discountAnnual), r(t.taxOneTime + t.taxMonthly + t.taxAnnual),
    r(t.initialPaymentDue), r(t.estimatedContractValue), cap(q.status), q.link, q.number, new Date().toISOString(),
  ];
}

export function quoteItemRows(quoteId: string, doc: QuoteDoc, totals: QuoteTotals): Cell[][] {
  return doc.items.map((it, i) => {
    const line = totals.lines[i];
    const unit = it.billingModel === "setup_plus_monthly" ? 0 : it.unitPrice;
    return [
      quoteId, it.serviceId ?? it.offerId ?? "custom", it.name, it.quantity, r(unit), it.billingModel,
      r(it.billingModel === "setup_plus_monthly" ? it.setupFee : 0), r(it.monthlyFee || it.annualFee),
      it.optional ? "Optional" : "Included", r(line.oneTime || line.monthly || line.annual || line.adSpendMonthly || line.thirdPartyOneTime || line.thirdPartyMonthly),
      truncate(it.notes), i + 1, it.offerId ?? "",
    ];
  });
}

export function catalogueRows(
  services: { id: string; name: string; linkName: string; industryNames: string[]; defaultModel: string; priceOptions: { label: string; unitPrice?: number; setupFee?: number; monthlyFee?: number; annualFee?: number }[]; deliveryCostOneTime: number; deliveryCostMonthly: number; active: boolean; origin: string }[],
  offers: { id: string; name: string; audience: string; upfrontKind: string; upfrontMin: number | null; upfrontMax: number | null; upfrontIncluded: boolean; monthlyMin: number | null; monthlyMax: number | null; monthlyTermMonths: number | null; deliveryCostOneTime: number; deliveryCostMonthly: number; active: boolean; origin: string }[],
): Cell[][] {
  const range = (a: number | null, b: number | null) => (a == null ? "" : a === b ? a / 100 : `${a / 100}–${(b ?? a) / 100}`);
  const sRows = services.map((s) => {
    const o = s.priceOptions[0];
    return [
      s.id, s.name, s.linkName, s.industryNames.length ? s.industryNames.join(", ") : "All industries", s.defaultModel,
      o?.unitPrice != null ? o.unitPrice / 100 : "", o?.setupFee != null ? o.setupFee / 100 : "", o?.monthlyFee != null ? o.monthlyFee / 100 : "", o?.annualFee != null ? o.annualFee / 100 : "",
      costLabel(s.deliveryCostOneTime, s.deliveryCostMonthly), s.active ? "Active" : "Inactive", s.origin === "opportunity_board" ? (o ? "Board service; price = brief example" : "Board service; price not configured") : "Admin",
    ] as Cell[];
  });
  const oRows = offers.map((o) => [
    o.id, o.name, "Packaged offer", o.audience, `${o.upfrontKind === "project" ? "Project" : "Setup"} + monthly${o.monthlyTermMonths ? ` × ${o.monthlyTermMonths}` : ""}`,
    "", o.upfrontIncluded ? "Included" : range(o.upfrontMin, o.upfrontMax), range(o.monthlyMin, o.monthlyMax), "",
    costLabel(o.deliveryCostOneTime, o.deliveryCostMonthly), o.active ? "Active" : "Inactive", o.origin === "opportunity_board" ? "Opportunity Board band" : "Admin",
  ] as Cell[]);
  return [...sRows, ...oRows];
}

function costLabel(one: number, mon: number): Cell {
  if (!one && !mon) return "";
  return [one ? `${one / 100} one-time` : "", mon ? `${mon / 100}/month` : ""].filter(Boolean).join("; ");
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Sheets cells hold at most 50,000 characters. */
const truncate = (s: string) => (s.length > 49_000 ? `${s.slice(0, 49_000)}…` : s);
