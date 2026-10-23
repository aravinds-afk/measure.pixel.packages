import { describe, expect, it } from "vitest";
import {
  COMPETITOR_CAP, DEFAULT_SETTINGS, DEFAULT_WEIGHTS, bandFor, computeCompatibility, matchCategory, validateWeights, type MemberProfile,
} from "../supabase/functions/_shared/engine/index.ts";
import { DEMO_IDS, DEMO_MEMBERS, DEMO_REFERRALS } from "../supabase/functions/_shared/demo-data.ts";

const m = (k: keyof typeof DEMO_IDS) => DEMO_MEMBERS.find((x) => x.id === DEMO_IDS[k])! as MemberProfile;
const stats = DEMO_REFERRALS.reduce<{ giverId: string; receiverId: string; count: number; closed: number }[]>((acc, r) => {
  const s = acc.find((x) => x.giverId === r.giverId && x.receiverId === r.receiverId) ?? (acc.push({ giverId: r.giverId, receiverId: r.receiverId, count: 0, closed: 0 }), acc[acc.length - 1]);
  s.count++;
  if (r.status === "business_closed") s.closed++;
  return acc;
}, []);

describe("compatibility scoring", () => {
  it("total equals the weighted sum of factor contributions", () => {
    const r = computeCompatibility(m("priya"), m("arjun"));
    const sum = r.factors.reduce((s, f) => s + (f.score == null ? 0 : (f.score * f.effectiveWeight) / 100), 0);
    expect(Math.abs(Math.round(sum) - r.score)).toBeLessThanOrEqual(1);
    expect(r.factors.reduce((s, f) => s + f.effectiveWeight, 0)).toBeCloseTo(100, 0);
  });

  it("demonstrates high, moderate and low compatibility on the demo data", () => {
    expect(computeCompatibility(m("priya"), m("arjun")).score).toBeGreaterThanOrEqual(90);
    const moderate = computeCompatibility(m("vikram"), m("ananya")).score;
    expect(moderate).toBeGreaterThanOrEqual(60);
    expect(moderate).toBeLessThan(80);
    expect(computeCompatibility(m("sneha"), m("priya")).score).toBeLessThan(40);
  });

  it("is symmetric in score", () => {
    for (const [a, b] of [["priya", "arjun"], ["sneha", "vikram"], ["tara", "suresh"]] as const) {
      expect(computeCompatibility(m(a), m(b)).score).toBe(computeCompatibility(m(b), m(a)).score);
    }
  });

  it("caps direct competitors and labels them", () => {
    const r = computeCompatibility(m("rohan"), m("rahul"));
    expect(r.isCompetitor).toBe(true);
    expect(r.score).toBeLessThanOrEqual(COMPETITOR_CAP);
    expect(r.referrals.aToB.some((o) => o.type.startsWith("Overflow"))).toBe(true);
  });

  it("does not treat missing data as a negative match", () => {
    const full = m("priya");
    const sparse: MemberProfile = { ...m("arjun"), customerSegments: [], companySizes: [], industries: [], serviceAreas: [], problemsSolved: [], icpDescription: null };
    const r = computeCompatibility(full, sparse);
    for (const k of ["icp_overlap", "industry_overlap", "geographic_alignment", "shared_problems"]) {
      const f = r.factors.find((x) => x.key === k)!;
      expect(f.score).toBeNull();
      expect(f.contribution).toBe(0);
      expect(f.effectiveWeight).toBe(0);
    }
    // Score comes from the remaining factors, not dragged toward zero.
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.confidence.level).not.toBe("High");
  });

  it("flags very sparse profiles as low confidence / exploratory", () => {
    const r = computeCompatibility(m("tara"), m("suresh"));
    expect(r.confidence.level).toBe("Low");
    expect(r.exploratory).toBe(true);
    const u = computeCompatibility(m("imran"), m("priya"));
    expect(u.confidence.level).toBe("Low");
    expect(u.factors.find((f) => f.key === "referral_potential")!.score).toBeNull();
  });

  it("distinguishes reciprocal from one-way referral flows", () => {
    const recip = computeCompatibility(m("priya"), m("rohan"));
    expect(Math.abs(recip.directional.aToB - recip.directional.bToA)).toBeLessThan(15);
    const oneWay = computeCompatibility(m("lakshmi"), m("karthik"));
    expect(oneWay.directional.aToB - oneWay.directional.bToA).toBeGreaterThan(25);
  });

  it("separates proven history from potential", () => {
    const without = computeCompatibility(m("sneha"), m("vikram"));
    const withHist = computeCompatibility(m("sneha"), m("vikram"), { referralStats: stats });
    expect(without.history.proven).toBe(false);
    expect(withHist.history.proven).toBe(true);
    expect(withHist.factors.find((f) => f.key === "relationship_potential")!.score).toBe(100);
    expect(withHist.summary).toMatch(/history confirms/);
  });

  it("produces specific, evidence-backed reciprocal opportunities", () => {
    const r = computeCompatibility(m("priya"), m("arjun"));
    for (const list of [r.referrals.aToB, r.referrals.bToA]) {
      expect(list.length).toBeGreaterThan(0);
      for (const o of list) {
        expect(o.evidence.length).toBeGreaterThan(0);
        expect(o.qualificationQuestions.length).toBeGreaterThan(0);
        expect(o.suggestedIntro).toContain("[Prospect");
        expect(o.title.toLowerCase()).not.toBe("refer business owners");
      }
    }
    expect(r.referrals.bToA.some((o) => o.triggerWords.length >= 3)).toBe(true);
    expect(r.triggers.length).toBeGreaterThan(0);
    expect(r.scripts.aAboutB.whatsapp).toContain("Arjun");
  });

  it("honours configurable weights and bands", () => {
    const heavyGeo = { ...DEFAULT_WEIGHTS, icp_overlap: 0, geographic_alignment: 25 };
    const r = computeCompatibility(m("sneha"), m("priya"), { settings: { ...DEFAULT_SETTINGS, weights: heavyGeo } });
    const base = computeCompatibility(m("sneha"), m("priya"));
    expect(r.score).toBeGreaterThan(base.score);
    expect(bandFor(95, [{ min: 0, label: "Low" }, { min: 80, label: "Top" }])).toBe("Top");
    expect(validateWeights(DEFAULT_WEIGHTS).ok).toBe(true);
    expect(validateWeights({ ...DEFAULT_WEIGHTS, icp_overlap: 30 }).ok).toBe(false);
  });

  it("rejects comparing a member with themselves", () => {
    expect(() => computeCompatibility(m("priya"), m("priya"))).toThrow();
  });

  it("maps free-text categories to the taxonomy", () => {
    expect(matchCategory("Chartered Accountant (Tax & Audit)")).toBe("chartered_accountant");
    expect(matchCategory("Digital Marketing Agency")).toBe("digital_marketing");
    expect(matchCategory("Home loans")).toBe("mortgage_broker");
    expect(matchCategory("Ayurvedic Wellness Clinic")).toBeNull();
  });
});
