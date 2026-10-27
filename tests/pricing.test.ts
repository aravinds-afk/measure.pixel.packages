import { describe, expect, it } from "vitest";
import { computeTotals, clientTotals } from "@/lib/pricing";
import { customLine, emptyDoc, lineFromOffer, lineFromService } from "@/lib/lines";
import type { QuoteDoc } from "@/lib/quote-schema";
import { DEFAULT_SETTINGS } from "@/data/defaults";
import { OFFERS } from "@/data/opportunity-board";
import { sourceOfferRow, sourceServiceRow } from "@/server/seed";
import { SERVICES } from "@/data/opportunity-board";
import { formatBand, formatINR } from "@/lib/money";

const noTax = (): QuoteDoc => ({ ...emptyDoc(DEFAULT_SETTINGS), tax: { enabled: false, label: "GST", ratePercent: 18 } });
const offer = (id: string) => sourceOfferRow(OFFERS.find((o) => o.id === id)!, 0);
const service = (id: string) => sourceServiceRow(SERVICES.find((s) => s.id === id)!, 0);

describe("pricing engine — brief examples", () => {
  it("5 social media videos at ₹3,500 = ₹17,500 one-time", () => {
    const doc = noTax();
    const line = lineFromService(service("video-production"), "social-media-video");
    line.quantity = 5;
    doc.items.push(line);
    const t = computeTotals(doc);
    expect(t.oneTimeSubtotal).toBe(17_500_00);
    expect(t.monthlySubtotal).toBe(0);
  });

  it("5 YouTube videos at ₹5,000 = ₹25,000", () => {
    const doc = noTax();
    const line = lineFromService(service("video-production"), "youtube-marketing-video");
    line.quantity = 5;
    doc.items.push(line);
    expect(computeTotals(doc).oneTimeSubtotal).toBe(25_000_00);
  });

  it("performance marketing management is monthly, not one-time", () => {
    const doc = noTax();
    doc.items.push(lineFromService(service("meta-ads"), "performance-management-video"));
    const t = computeTotals(doc);
    expect(t.monthlySubtotal).toBe(60_000_00);
    expect(t.oneTimeSubtotal).toBe(0);
  });
});

describe("pricing engine — buckets", () => {
  it("keeps one-time, monthly, annual, ad spend and optional separate", () => {
    const doc = noTax();
    doc.items.push(lineFromOffer(offer("clinic-patient-engine"))); // setup 40K + 35K/mo
    const annual = customLine();
    annual.billingModel = "annual";
    annual.annualFee = 12_000_00;
    doc.items.push(annual);
    const ads = customLine();
    ads.billingModel = "ad_spend";
    ads.monthlyFee = 30_000_00;
    doc.items.push(ads);
    const opt = lineFromService(service("video-production"), "social-media-video");
    opt.optional = true;
    opt.quantity = 2;
    doc.items.push(opt);
    const t = computeTotals(doc);
    expect(t.oneTimeSubtotal).toBe(40_000_00);
    expect(t.monthlySubtotal).toBe(35_000_00);
    expect(t.annualSubtotal).toBe(12_000_00);
    expect(t.adSpendMonthly).toBe(30_000_00);
    expect(t.optionalOneTime).toBe(7_000_00);
    // Initial payment: setup + first month + annual, no ad spend, no optional.
    expect(t.initialPaymentDue).toBe(40_000_00 + 35_000_00 + 12_000_00);
  });

  it("does not assume a 12-month contract", () => {
    const doc = noTax();
    doc.items.push(lineFromOffer(offer("measurement-retainer")));
    expect(computeTotals(doc).estimatedContractValue).toBeNull();
    doc.billing.contractMonths = 6;
    const t = computeTotals(doc);
    expect(t.estimatedContractValue).toBe(30_000_00 + 15_000_00 * 6);
    expect(t.estimatedFirst12Months).toBe(30_000_00 + 15_000_00 * 6);
  });

  it("honours the offer's fixed monthly term (Admissions × 6)", () => {
    const doc = noTax();
    doc.items.push(lineFromOffer(offer("admissions-season-engine")));
    doc.billing.contractMonths = 12;
    const t = computeTotals(doc);
    expect(t.oneTimeSubtotal).toBe(0);
    expect(t.estimatedContractValue).toBe(50_000_00 * 6);
    expect(t.issues).toEqual([]);
  });

  it("applies percent discount and GST on the net, rounding to paise", () => {
    const doc = emptyDoc(DEFAULT_SETTINGS); // GST 18% on
    doc.items.push(lineFromOffer(offer("local-domination-pack"))); // 15K + 18K/mo
    doc.discount = { type: "percent", value: 10, appliesTo: "both", reason: "BNI member" };
    const t = computeTotals(doc);
    expect(t.discountOneTime).toBe(1_500_00);
    expect(t.discountMonthly).toBe(1_800_00);
    expect(t.oneTimeNet).toBe(13_500_00);
    expect(t.taxOneTime).toBe(2_430_00);
    expect(t.monthlyTotal).toBe(16_200_00 + 2_916_00);
    expect(t.effectiveDiscountPercent).toBeCloseTo(10);
  });

  it("caps an amount discount at the bucket", () => {
    const doc = noTax();
    doc.items.push(lineFromOffer(offer("local-domination-pack")));
    doc.discount = { type: "amount", value: 99_999_00, appliesTo: "one_time", reason: "x" };
    expect(computeTotals(doc).oneTimeNet).toBe(0);
  });

  it("quarterly billing bills three months of recurring up front", () => {
    const doc = noTax();
    doc.items.push(lineFromOffer(offer("measurement-retainer")));
    doc.billing.frequency = "quarterly";
    expect(computeTotals(doc).initialPaymentDue).toBe(30_000_00 + 15_000_00 * 3);
  });

  it("flags unpriced services and band warnings", () => {
    const doc = noTax();
    doc.items.push(lineFromService(service("photography")));
    const o = lineFromOffer(offer("clinic-patient-engine"));
    o.monthlyFee = 99_000_00;
    doc.items.push(o);
    const t = computeTotals(doc);
    expect(t.issues.some((i) => i.includes("price not set"))).toBe(true);
    expect(t.warnings.some((w) => w.includes("monthly fee outside"))).toBe(true);
  });

  it("client totals carry no internal cost or margin fields", () => {
    const doc = noTax();
    const l = lineFromOffer(offer("clinic-patient-engine"));
    l.deliveryCostMonthly = 10_000_00;
    doc.items.push(l);
    const ct = clientTotals(computeTotals(doc)) as Record<string, unknown>;
    expect(ct.internal).toBeUndefined();
    expect(JSON.stringify(ct)).not.toContain("deliveryCost");
    expect(JSON.stringify(ct)).not.toContain("margin");
  });
});

describe("money formatting", () => {
  it("formats Indian grouping and board bands", () => {
    expect(formatINR(3_00_000_00)).toBe("₹3,00,000");
    expect(formatBand(40_000_00, 60_000_00)).toBe("₹40–60K");
    expect(formatBand(1_50_000_00, 3_00_000_00)).toBe("₹1.5–3L");
    expect(formatBand(50_000_00, 50_000_00)).toBe("₹50K");
  });
});
