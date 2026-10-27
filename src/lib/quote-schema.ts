import { z } from "zod";

/** Shared (client + server) shape of an editable quotation. Money = integer paise. */

const paise = z.number().int().min(0).max(10_000_000_000); // ≤ ₹10 crore per field

export const BILLING_MODELS = [
  "per_unit",
  "fixed_project",
  "fixed_package",
  "setup_plus_monthly",
  "monthly",
  "annual",
  "custom",
  "ad_spend",
  "third_party",
] as const;
export type BillingModel = (typeof BILLING_MODELS)[number];

export const BILLING_MODEL_LABELS: Record<BillingModel, string> = {
  per_unit: "Per unit",
  fixed_project: "Fixed project fee",
  fixed_package: "Fixed package",
  setup_plus_monthly: "Setup + monthly",
  monthly: "Monthly retainer",
  annual: "Annual subscription",
  custom: "Custom quotation",
  ad_spend: "Advertising spend",
  third_party: "Third-party cost",
};

export const band = z.object({ min: paise, max: paise }).nullable();

export const deliverableSchema = z.object({
  label: z.string().max(200),
  serviceIds: z.array(z.string()).max(10),
  included: z.boolean(),
});

export const lineItemSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["offer", "service", "custom"]),
  offerId: z.string().max(80).nullable(),
  serviceId: z.string().max(80).nullable(),
  optionId: z.string().max(80).nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  deliverables: z.array(deliverableSchema).max(30),
  billingModel: z.enum(BILLING_MODELS),
  quantity: z.number().int().min(1).max(10000),
  unitLabel: z.string().max(40),
  /** One-time price per unit (per_unit, fixed_project, fixed_package, custom, third_party one-off). */
  unitPrice: paise,
  /** One-time setup or project fee (setup_plus_monthly, custom). */
  setupFee: paise,
  upfrontLabel: z.enum(["Setup", "Project"]),
  monthlyFee: paise,
  annualFee: paise,
  /** Fixed recurring term printed on an offer, e.g. 6 for "MONTHLY × 6". */
  termMonths: z.number().int().min(1).max(120).nullable(),
  optional: z.boolean(),
  notes: z.string().max(2000),
  /** Internal only — never sent to client views. */
  internalNote: z.string().max(2000),
  deliveryCostOneTime: paise,
  deliveryCostMonthly: paise,
  bands: z.object({ upfront: band, monthly: band }).nullable(),
  priceSource: z.enum(["board-band", "catalogue", "brief-example", "manual"]),
  recommendationId: z.string().max(64).nullable(),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const discountSchema = z.object({
  type: z.enum(["percent", "amount"]),
  value: z.number().min(0),
  appliesTo: z.enum(["one_time", "recurring", "both"]),
  reason: z.string().max(500),
});
export type Discount = z.infer<typeof discountSchema>;

export const quoteDocSchema = z.object({
  client: z.object({
    businessName: z.string().max(200),
    contactPerson: z.string().max(200),
    email: z.string().max(200),
    phone: z.string().max(50),
    website: z.string().max(500),
    industryName: z.string().max(200),
  }),
  summary: z.object({
    needs: z.string().max(5000),
    solution: z.string().max(5000),
  }),
  items: z.array(lineItemSchema).max(100),
  discount: discountSchema.nullable(),
  tax: z.object({ enabled: z.boolean(), label: z.string().max(30), ratePercent: z.number().min(0).max(50) }),
  billing: z.object({
    frequency: z.enum(["monthly", "quarterly", "annually"]),
    contractMonths: z.number().int().min(1).max(120).nullable(),
    startDate: z.string().max(20).nullable(),
    firstRecurringDueUpfront: z.boolean(),
  }),
  terms: z.object({
    paymentTerms: z.string().max(5000),
    assumptions: z.string().max(5000),
    exclusions: z.string().max(5000),
    nextSteps: z.string().max(5000),
    custom: z.string().max(5000),
  }),
  validityDays: z.number().int().min(1).max(365),
  internalNotes: z.string().max(5000),
});
export type QuoteDoc = z.infer<typeof quoteDocSchema>;

export const QUOTE_STATUSES = ["draft", "presented", "sent", "accepted", "rejected", "expired"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
