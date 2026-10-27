import { roundPaise } from "./money";
import type { BillingModel, Discount, LineItem, QuoteDoc } from "./quote-schema";

/**
 * Deterministic pricing engine. Runs in the browser for instant totals and
 * on the server, which recomputes and stores its own result. All amounts are
 * integer paise.
 *
 * Buckets are never merged: one-time, monthly and annual fees are reported
 * separately; ad spend and third-party costs sit outside our fees (no
 * discount, no tax); optional items are shown but excluded from totals.
 */

export type LineAmounts = {
  oneTime: number;
  monthly: number;
  annual: number;
  adSpendMonthly: number;
  thirdPartyOneTime: number;
  thirdPartyMonthly: number;
};

export type LineResult = LineAmounts & {
  id: string;
  /** Headline amount for the line: one-time if any, else monthly, else annual. */
  lineTotal: number;
  /** Blocking: the quotation cannot be issued until fixed. */
  issues: string[];
  /** Non-blocking: shown to the consultant (e.g. price outside the board band). */
  warnings: string[];
};

export type QuoteTotals = {
  lines: LineResult[];
  oneTimeSubtotal: number;
  monthlySubtotal: number;
  annualSubtotal: number;
  discountOneTime: number;
  discountMonthly: number;
  discountAnnual: number;
  discountTotalFirstPeriod: number;
  oneTimeNet: number;
  monthlyNet: number;
  annualNet: number;
  taxRatePercent: number;
  taxOneTime: number;
  taxMonthly: number;
  taxAnnual: number;
  oneTimeTotal: number;
  monthlyTotal: number;
  annualTotal: number;
  optionalOneTime: number;
  optionalMonthly: number;
  optionalAnnual: number;
  adSpendMonthly: number;
  thirdPartyOneTime: number;
  thirdPartyMonthly: number;
  billingPeriodMonths: number;
  firstRecurringInvoice: number;
  initialPaymentDue: number;
  /** Excl. tax. Null until a contract duration is set — never assume 12 months. */
  estimatedContractValue: number | null;
  estimatedFirst12Months: number | null;
  /** Discount as a percentage of the discounted base, for permission checks. */
  effectiveDiscountPercent: number;
  internal: {
    deliveryCostOneTime: number;
    deliveryCostMonthly: number;
    grossProfitOneTime: number;
    grossProfitMonthly: number;
    marginOneTimePercent: number | null;
    marginMonthlyPercent: number | null;
    costsConfigured: boolean;
  };
  issues: string[];
  warnings: string[];
};

const ZERO: LineAmounts = { oneTime: 0, monthly: 0, annual: 0, adSpendMonthly: 0, thirdPartyOneTime: 0, thirdPartyMonthly: 0 };

/** Which price fields a billing model uses. The UI shows only these. */
export const MODEL_FIELDS: Record<BillingModel, { unitPrice: boolean; setupFee: boolean; monthlyFee: boolean; annualFee: boolean }> = {
  per_unit: { unitPrice: true, setupFee: false, monthlyFee: false, annualFee: false },
  fixed_project: { unitPrice: true, setupFee: false, monthlyFee: false, annualFee: false },
  fixed_package: { unitPrice: true, setupFee: false, monthlyFee: false, annualFee: false },
  setup_plus_monthly: { unitPrice: false, setupFee: true, monthlyFee: true, annualFee: false },
  monthly: { unitPrice: false, setupFee: false, monthlyFee: true, annualFee: false },
  annual: { unitPrice: false, setupFee: false, monthlyFee: false, annualFee: true },
  custom: { unitPrice: true, setupFee: false, monthlyFee: true, annualFee: false },
  ad_spend: { unitPrice: false, setupFee: false, monthlyFee: true, annualFee: false },
  third_party: { unitPrice: true, setupFee: false, monthlyFee: true, annualFee: false },
};

export function lineAmounts(item: LineItem): LineAmounts {
  const q = item.quantity;
  const f = MODEL_FIELDS[item.billingModel];
  const unit = f.unitPrice ? item.unitPrice : 0;
  const setup = f.setupFee ? item.setupFee : 0;
  const monthly = f.monthlyFee ? item.monthlyFee : 0;
  const annual = f.annualFee ? item.annualFee : 0;
  switch (item.billingModel) {
    case "ad_spend":
      return { ...ZERO, adSpendMonthly: q * monthly };
    case "third_party":
      return { ...ZERO, thirdPartyOneTime: q * unit, thirdPartyMonthly: q * monthly };
    default:
      return { ...ZERO, oneTime: q * (unit + setup), monthly: q * monthly, annual: q * annual };
  }
}

export function lineIssues(item: LineItem): { issues: string[]; warnings: string[] } {
  const a = lineAmounts(item);
  const issues: string[] = [];
  const warnings: string[] = [];
  const total = a.oneTime + a.monthly + a.annual + a.adSpendMonthly + a.thirdPartyOneTime + a.thirdPartyMonthly;
  const includedUpfront = item.kind === "offer" && item.bands?.upfront === null;
  if (total === 0 && !includedUpfront) issues.push(`${item.name}: price not set`);
  if (item.kind === "offer" && item.bands) {
    const { upfront, monthly } = item.bands;
    const upfrontValue = item.billingModel === "setup_plus_monthly" ? item.setupFee : item.unitPrice;
    if (upfront && (upfrontValue < upfront.min || upfrontValue > upfront.max)) warnings.push(`${item.name}: upfront fee outside the board band`);
    if (monthly && MODEL_FIELDS[item.billingModel].monthlyFee && (item.monthlyFee < monthly.min || item.monthlyFee > monthly.max))
      warnings.push(`${item.name}: monthly fee outside the board band`);
  }
  return { issues, warnings };
}

function discountAmounts(d: Discount | null, oneTime: number, monthly: number, annual: number) {
  if (!d || d.value <= 0) return { one: 0, mon: 0, ann: 0 };
  const onOne = d.appliesTo === "one_time" || d.appliesTo === "both";
  const onRec = d.appliesTo === "recurring" || d.appliesTo === "both";
  if (d.type === "percent") {
    const pct = Math.min(d.value, 100) / 100;
    return {
      one: onOne ? roundPaise(oneTime * pct) : 0,
      mon: onRec ? roundPaise(monthly * pct) : 0,
      ann: onRec ? roundPaise(annual * pct) : 0,
    };
  }
  // Fixed amount (paise). "both" is ambiguous for an amount, so it applies to one-time first, remainder to monthly.
  let remaining = Math.round(d.value);
  const one = onOne ? Math.min(remaining, oneTime) : 0;
  remaining -= one;
  const mon = onRec ? Math.min(remaining, monthly) : 0;
  return { one, mon, ann: 0 };
}

const PERIOD_MONTHS = { monthly: 1, quarterly: 3, annually: 12 } as const;

export function computeTotals(doc: QuoteDoc): QuoteTotals {
  const lines: LineResult[] = doc.items.map((item) => {
    const a = lineAmounts(item);
    return { id: item.id, ...a, lineTotal: a.oneTime || a.monthly || a.annual || a.adSpendMonthly || a.thirdPartyOneTime || a.thirdPartyMonthly, ...lineIssues(item) };
  });

  let oneTimeSubtotal = 0, monthlySubtotal = 0, annualSubtotal = 0;
  let optionalOneTime = 0, optionalMonthly = 0, optionalAnnual = 0;
  let adSpendMonthly = 0, thirdPartyOneTime = 0, thirdPartyMonthly = 0;
  let costOne = 0, costMon = 0, costsConfigured = false;

  doc.items.forEach((item, i) => {
    const a = lines[i];
    if (item.optional) {
      optionalOneTime += a.oneTime;
      optionalMonthly += a.monthly;
      optionalAnnual += a.annual;
      return;
    }
    oneTimeSubtotal += a.oneTime;
    monthlySubtotal += a.monthly;
    annualSubtotal += a.annual;
    adSpendMonthly += a.adSpendMonthly;
    thirdPartyOneTime += a.thirdPartyOneTime;
    thirdPartyMonthly += a.thirdPartyMonthly;
    if (item.deliveryCostOneTime || item.deliveryCostMonthly) costsConfigured = true;
    costOne += item.quantity * item.deliveryCostOneTime;
    costMon += item.quantity * item.deliveryCostMonthly;
  });

  const d = discountAmounts(doc.discount, oneTimeSubtotal, monthlySubtotal, annualSubtotal);
  const oneTimeNet = oneTimeSubtotal - d.one;
  const monthlyNet = monthlySubtotal - d.mon;
  const annualNet = annualSubtotal - d.ann;

  const rate = doc.tax.enabled ? doc.tax.ratePercent : 0;
  const tax = (n: number) => roundPaise((n * rate) / 100);
  const taxOneTime = tax(oneTimeNet);
  const taxMonthly = tax(monthlyNet);
  const taxAnnual = tax(annualNet);

  // Recurring months per item, honouring fixed terms (e.g. "MONTHLY × 6").
  const monthlyRatio = monthlySubtotal > 0 ? monthlyNet / monthlySubtotal : 1;
  const recurringFor = (months: number) =>
    roundPaise(
      doc.items.reduce((sum, item, i) => {
        if (item.optional) return sum;
        const m = Math.min(months, item.termMonths ?? months);
        return sum + lines[i].monthly * m;
      }, 0) * monthlyRatio,
    );

  const period = PERIOD_MONTHS[doc.billing.frequency];
  const firstRecurringNet = recurringFor(period);
  const firstRecurringInvoice = doc.billing.firstRecurringDueUpfront ? firstRecurringNet + tax(firstRecurringNet) : 0;
  const initialPaymentDue = oneTimeNet + taxOneTime + firstRecurringInvoice + annualNet + taxAnnual;

  const contract = doc.billing.contractMonths;
  const estimatedContractValue = contract == null ? null : oneTimeNet + recurringFor(contract) + annualNet * Math.ceil(contract / 12);
  const estimatedFirst12Months = contract == null ? null : oneTimeNet + recurringFor(Math.min(contract, 12)) + annualNet;

  const discountBase =
    (d.one ? oneTimeSubtotal : 0) + (d.mon ? monthlySubtotal : 0) + (d.ann ? annualSubtotal : 0);
  const discountSum = d.one + d.mon + d.ann;
  const effectiveDiscountPercent = discountBase > 0 ? (discountSum / discountBase) * 100 : 0;

  const issues = lines.flatMap((l) => l.issues);
  const warnings = lines.flatMap((l) => l.warnings);
  if (doc.items.filter((i) => !i.optional).length === 0) issues.push("Add at least one included service");

  return {
    lines,
    oneTimeSubtotal, monthlySubtotal, annualSubtotal,
    discountOneTime: d.one, discountMonthly: d.mon, discountAnnual: d.ann,
    discountTotalFirstPeriod: d.one + d.mon * period + d.ann,
    oneTimeNet, monthlyNet, annualNet,
    taxRatePercent: rate, taxOneTime, taxMonthly, taxAnnual,
    oneTimeTotal: oneTimeNet + taxOneTime,
    monthlyTotal: monthlyNet + taxMonthly,
    annualTotal: annualNet + taxAnnual,
    optionalOneTime, optionalMonthly, optionalAnnual,
    adSpendMonthly, thirdPartyOneTime, thirdPartyMonthly,
    billingPeriodMonths: period,
    firstRecurringInvoice,
    initialPaymentDue,
    estimatedContractValue,
    estimatedFirst12Months,
    effectiveDiscountPercent,
    internal: {
      deliveryCostOneTime: costOne,
      deliveryCostMonthly: costMon,
      grossProfitOneTime: oneTimeNet - costOne,
      grossProfitMonthly: monthlyNet - costMon,
      marginOneTimePercent: costsConfigured && oneTimeNet > 0 ? ((oneTimeNet - costOne) / oneTimeNet) * 100 : null,
      marginMonthlyPercent: costsConfigured && monthlyNet > 0 ? ((monthlyNet - costMon) / monthlyNet) * 100 : null,
      costsConfigured,
    },
    issues,
    warnings,
  };
}

/** Totals that are safe to show a client (no internal block). */
export type ClientTotals = Omit<QuoteTotals, "internal" | "effectiveDiscountPercent" | "lines" | "issues" | "warnings"> & {
  lines: Omit<LineResult, "issues" | "warnings">[];
};

/** Allowlist copy: anything not named here never reaches a client view. */
export function clientTotals(t: QuoteTotals): ClientTotals {
  return {
    oneTimeSubtotal: t.oneTimeSubtotal, monthlySubtotal: t.monthlySubtotal, annualSubtotal: t.annualSubtotal,
    discountOneTime: t.discountOneTime, discountMonthly: t.discountMonthly, discountAnnual: t.discountAnnual,
    discountTotalFirstPeriod: t.discountTotalFirstPeriod,
    oneTimeNet: t.oneTimeNet, monthlyNet: t.monthlyNet, annualNet: t.annualNet,
    taxRatePercent: t.taxRatePercent, taxOneTime: t.taxOneTime, taxMonthly: t.taxMonthly, taxAnnual: t.taxAnnual,
    oneTimeTotal: t.oneTimeTotal, monthlyTotal: t.monthlyTotal, annualTotal: t.annualTotal,
    optionalOneTime: t.optionalOneTime, optionalMonthly: t.optionalMonthly, optionalAnnual: t.optionalAnnual,
    adSpendMonthly: t.adSpendMonthly, thirdPartyOneTime: t.thirdPartyOneTime, thirdPartyMonthly: t.thirdPartyMonthly,
    billingPeriodMonths: t.billingPeriodMonths, firstRecurringInvoice: t.firstRecurringInvoice,
    initialPaymentDue: t.initialPaymentDue,
    estimatedContractValue: t.estimatedContractValue, estimatedFirst12Months: t.estimatedFirst12Months,
    lines: t.lines.map((l) => ({
      id: l.id, oneTime: l.oneTime, monthly: l.monthly, annual: l.annual, adSpendMonthly: l.adSpendMonthly,
      thirdPartyOneTime: l.thirdPartyOneTime, thirdPartyMonthly: l.thirdPartyMonthly, lineTotal: l.lineTotal,
    })),
  };
}
