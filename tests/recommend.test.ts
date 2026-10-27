import { describe, expect, it } from "vitest";
import { AUDIT_ITEMS, BUSINESS_GOALS, DEPENDENCY_RULES, RECOMMENDATION_RULES } from "@/data/defaults";
import { INDUSTRIES, OFFERS, SERVICES } from "@/data/opportunity-board";
import { recommend, type Catalog, type RecommendationInput } from "@/lib/recommend";
import { sourceOfferRow } from "@/server/seed";

const catalog: Catalog = {
  offers: OFFERS.map((o, i) => ({ ...sourceOfferRow(o, i), active: true })),
  services: SERVICES.map((s) => ({ ...s, active: true })),
  auditItems: AUDIT_ITEMS,
  rules: RECOMMENDATION_RULES.map((r) => ({ ...r, active: true })),
  dependencies: DEPENDENCY_RULES.map((d) => ({ ...d, active: true })),
  goals: [...BUSINESS_GOALS],
};

const input = (over: Partial<RecommendationInput>): RecommendationInput => ({
  industryId: null,
  industryClusterId: null,
  goals: [],
  painOfferIds: [],
  responses: {},
  budgetMonthly: null,
  readiness: null,
  ...over,
});
const dental = { industryId: "dental-clinics", industryClusterId: "healthcare" };

describe("recommendation engine", () => {
  it("recommends Clinic Patient Engine for a dental clinic with the brief's findings", () => {
    const r = recommend(catalog, input({
      ...dental,
      goals: ["more-enquiries"],
      responses: {
        "wc-conversion-rate": { status: "needs_improvement", confirmedByClient: true },
        "wc-landing-pages": { status: "missing" },
        "an-conversions": { status: "missing" },
        "pa-google-ads": { status: "missing" },
      },
    }));
    expect(r.offers[0].offerId).toBe("clinic-patient-engine");
    expect(r.offers[0].problems.map((p) => p.itemId)).toContain("an-conversions");
    expect(r.offers[0].why).toMatch(/Audit shows/);
    expect(r.offers[0].pricing.upfrontMin).toBe(40_000_00);
  });

  it("industry alone recommends nothing", () => {
    const r = recommend(catalog, input({ ...dental }));
    expect(r.offers).toEqual([]);
    expect(r.notes.join(" ")).toMatch(/No audit items assessed/);
  });

  it("does not recommend offers from another industry cluster", () => {
    const r = recommend(catalog, input({ ...dental, responses: { "seo-gbp": { status: "missing" }, "seo-reviews": { status: "missing" }, "seo-ranking": { status: "missing" } }, goals: ["local-visibility"] }));
    expect([...r.offers, ...r.otherOffers].map((o) => o.offerId)).not.toContain("local-domination-pack");
  });

  it("a recognised buyer quote can recommend an offer without audit gaps", () => {
    const r = recommend(catalog, input({ ...dental, painOfferIds: ["ai-follow-up-layer"], goals: ["improve-follow-up"] }));
    expect(r.offers.map((o) => o.offerId)).toContain("ai-follow-up-layer");
  });

  it("puts working capabilities in 'already in place' and not in supporting", () => {
    const r = recommend(catalog, input({ ...dental, responses: { "lc-whatsapp": { status: "working_well" }, "pa-google-ads": { status: "missing" }, "an-conversions": { status: "missing" }, "wc-landing-pages": { status: "missing" } } }));
    expect(r.inPlace.map((x) => x.serviceId)).toContain("whatsapp-intake");
    expect(r.supporting.map((x) => x.serviceId)).not.toContain("whatsapp-intake");
    const clinic = r.offers.find((o) => o.offerId === "clinic-patient-engine")!;
    expect(clinic.componentsInPlace.map((c) => c.label)).toContain("WhatsApp intake");
  });

  it("adds a missing dependency as a supporting service", () => {
    const r = recommend(catalog, input({ industryId: "ca-cfo-firms", industryClusterId: "money-b2b", responses: { "crm-follow-up": { status: "missing" } } }));
    const keys = r.supporting.map((x) => x.serviceId);
    expect(keys).toContain("crm-sales-automation");
    expect(keys).toContain("crm-setup"); // dependency
    expect(r.supporting.find((x) => x.serviceId === "crm-setup")!.kind).toBe("dependency");
  });

  it("caps primary offers at three and flags budget", () => {
    const allGaps = Object.fromEntries(AUDIT_ITEMS.map((i) => [i.id, { status: "missing" as const }]));
    const r = recommend(catalog, input({ ...dental, responses: allGaps, budgetMonthly: 10_000_00 }));
    expect(r.offers.length).toBeLessThanOrEqual(3);
    expect(r.offers.every((o) => o.budgetNote)).toBe(true);
  });

  it("every board industry belongs to a cluster used by at least one offer or 'any'", () => {
    expect(INDUSTRIES).toHaveLength(44);
    expect(SERVICES).toHaveLength(32);
    expect(OFFERS).toHaveLength(14);
    const ruleOffers = new Set(RECOMMENDATION_RULES.map((r) => r.offerId));
    expect(OFFERS.every((o) => ruleOffers.has(o.id))).toBe(true);
    const itemIds = new Set(AUDIT_ITEMS.map((i) => i.id));
    for (const r of RECOMMENDATION_RULES) for (const t of r.triggers) if (t.kind === "audit") expect(itemIds.has(t.itemId), t.itemId).toBe(true);
    const svcIds = new Set(SERVICES.map((s) => s.id));
    for (const i of AUDIT_ITEMS) for (const s of i.serviceIds) expect(svcIds.has(s), s).toBe(true);
    for (const o of OFFERS) for (const c of o.components) for (const s of c.serviceIds) expect(svcIds.has(s), s).toBe(true);
  });
});
