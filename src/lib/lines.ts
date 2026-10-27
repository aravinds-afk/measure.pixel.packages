import { newId } from "./ids";
import type { BillingModel, LineItem, QuoteDoc } from "./quote-schema";

/** Build quotation lines from catalogue records. Shared by the configurator and the server. */

export type OfferLike = {
  id: string;
  name: string;
  description?: string;
  components: { label: string; serviceIds: string[] }[];
  upfrontKind: "setup" | "project";
  upfrontMin: number | null;
  upfrontMax: number | null;
  upfrontIncluded: boolean;
  monthlyMin: number | null;
  monthlyMax: number | null;
  monthlyTermMonths: number | null;
  deliveryCostOneTime?: number;
  deliveryCostMonthly?: number;
};

export type PriceOptionLike = {
  id: string;
  label: string;
  model: BillingModel;
  unitPrice?: number;
  unitLabel?: string;
  setupFee?: number;
  monthlyFee?: number;
  annualFee?: number;
  source: "brief-example" | "admin";
};

export type ServiceLike = {
  id: string;
  name: string;
  description?: string;
  priceOptions: PriceOptionLike[];
  deliveryCostOneTime?: number;
  deliveryCostMonthly?: number;
};

const base = (): Omit<LineItem, "id" | "kind" | "name" | "billingModel"> => ({
  offerId: null,
  serviceId: null,
  optionId: null,
  description: "",
  deliverables: [],
  quantity: 1,
  unitLabel: "",
  unitPrice: 0,
  setupFee: 0,
  upfrontLabel: "Setup",
  monthlyFee: 0,
  annualFee: 0,
  termMonths: null,
  optional: false,
  notes: "",
  internalNote: "",
  deliveryCostOneTime: 0,
  deliveryCostMonthly: 0,
  bands: null,
  priceSource: "manual",
  recommendationId: null,
});

/** Offer line priced at the bottom of its board band; consultant adjusts within the band. */
export function lineFromOffer(o: OfferLike, recommendationId: string | null = null): LineItem {
  return {
    ...base(),
    id: newId("LI", 8),
    kind: "offer",
    offerId: o.id,
    name: o.name,
    description: o.description ?? "",
    deliverables: o.components.map((c) => ({ label: c.label, serviceIds: c.serviceIds, included: true })),
    billingModel: "setup_plus_monthly",
    upfrontLabel: o.upfrontKind === "project" ? "Project" : "Setup",
    setupFee: o.upfrontIncluded ? 0 : o.upfrontMin ?? 0,
    monthlyFee: o.monthlyMin ?? 0,
    termMonths: o.monthlyTermMonths,
    unitLabel: "package",
    bands: {
      upfront: o.upfrontIncluded || o.upfrontMin == null ? null : { min: o.upfrontMin, max: o.upfrontMax ?? o.upfrontMin },
      monthly: o.monthlyMin == null ? null : { min: o.monthlyMin, max: o.monthlyMax ?? o.monthlyMin },
    },
    priceSource: "board-band",
    deliveryCostOneTime: o.deliveryCostOneTime ?? 0,
    deliveryCostMonthly: o.deliveryCostMonthly ?? 0,
    recommendationId,
  };
}

export function lineFromService(svc: ServiceLike, optionId?: string | null, recommendationId: string | null = null): LineItem {
  const opt = svc.priceOptions.find((o) => o.id === optionId) ?? (optionId === undefined ? svc.priceOptions[0] : undefined);
  const line: LineItem = {
    ...base(),
    id: newId("LI", 8),
    kind: "service",
    serviceId: svc.id,
    name: svc.name,
    description: svc.description ?? "",
    billingModel: "custom",
    deliveryCostOneTime: svc.deliveryCostOneTime ?? 0,
    deliveryCostMonthly: svc.deliveryCostMonthly ?? 0,
    recommendationId,
  };
  if (!opt) return line;
  return {
    ...line,
    optionId: opt.id,
    name: opt.label === svc.name ? svc.name : `${svc.name} — ${opt.label}`,
    billingModel: opt.model,
    unitPrice: opt.unitPrice ?? 0,
    unitLabel: opt.unitLabel ?? "",
    setupFee: opt.setupFee ?? 0,
    monthlyFee: opt.monthlyFee ?? 0,
    annualFee: opt.annualFee ?? 0,
    priceSource: opt.source === "brief-example" ? "brief-example" : "catalogue",
  };
}

export function customLine(): LineItem {
  return { ...base(), id: newId("LI", 8), kind: "custom", name: "Custom item", billingModel: "fixed_project" };
}

export function emptyDoc(settings: {
  tax: { enabled: boolean; label: string; ratePercent: number };
  quote: { validityDays: number; paymentTerms: string; assumptions: string; exclusions: string; nextSteps: string; firstRecurringDueUpfront: boolean };
}): QuoteDoc {
  return {
    client: { businessName: "", contactPerson: "", email: "", phone: "", website: "", industryName: "" },
    summary: { needs: "", solution: "" },
    items: [],
    discount: null,
    tax: { enabled: settings.tax.enabled, label: settings.tax.label, ratePercent: settings.tax.ratePercent },
    billing: { frequency: "monthly", contractMonths: null, startDate: null, firstRecurringDueUpfront: settings.quote.firstRecurringDueUpfront },
    terms: {
      paymentTerms: settings.quote.paymentTerms,
      assumptions: settings.quote.assumptions,
      exclusions: settings.quote.exclusions,
      nextSteps: settings.quote.nextSteps,
      custom: "",
    },
    validityDays: settings.quote.validityDays,
    internalNotes: "",
  };
}
