import { describe, expect, it } from "vitest";
import { analyseSpheres, bestMatches, findPartners, meetingBrief, computeCompatibility, missingCategories, nextReferrals } from "../supabase/functions/_shared/engine/index.ts";
import { DEMO_IDS, DEMO_MEMBERS } from "../supabase/functions/_shared/demo-data.ts";

const m = (k: keyof typeof DEMO_IDS) => DEMO_MEMBERS.find((x) => x.id === DEMO_IDS[k])!;

describe("discovery", () => {
  it("best matches rank complementary partners first and competitors last", () => {
    const list = bestMatches(m("rohan"), DEMO_MEMBERS, {}, 20);
    expect(list.length).toBe(16);
    expect(list[list.length - 1].member.id).toBe(DEMO_IDS.rahul);
    expect(list.slice(0, 3).map((x) => x.member.id)).toContain(DEMO_IDS.priya);
  });

  it("finds referral partners for a customer problem from member data", () => {
    const hits = findPartners("cash flow problems", DEMO_MEMBERS);
    expect(hits[0].member.id).toBe(DEMO_IDS.kavya);
    const home = findPartners("family buying a home loan", DEMO_MEMBERS);
    expect(home.slice(0, 2).map((h) => h.member.id)).toContain(DEMO_IDS.vikram);
    expect(findPartners("", DEMO_MEMBERS)).toEqual([]);
  });

  it("next referrals exclude competitors and are ranked by strength", () => {
    const list = nextReferrals(m("rohan"), DEMO_MEMBERS);
    expect(list.every((n) => n.receiver.id !== DEMO_IDS.rahul)).toBe(true);
    for (let i = 1; i < list.length; i++) expect(list[i - 1].strength).toBeGreaterThanOrEqual(list[i].strength);
  });

  it("contact spheres use actual members and list missing professions separately", () => {
    const spheres = analyseSpheres(DEMO_MEMBERS);
    const growth = spheres.find((s) => s.id === "business_growth")!;
    const present = growth.present.map((p) => p.member.categoryId);
    expect(present).toContain("digital_marketing");
    expect(present).toContain("chartered_accountant");
    expect(growth.missing.map((x) => x.categoryId)).toContain("business_lawyer");
    expect(present).not.toContain("business_lawyer");
    expect(growth.fitScore).not.toBeNull();
    expect(growth.coordinator).not.toBeNull();
    // Unmapped categories are never placed in a sphere.
    expect(spheres.flatMap((s) => s.present).some((p) => p.member.id === DEMO_IDS.imran)).toBe(false);
  });

  it("ranks missing categories that existing members' clients need", () => {
    const missing = missingCategories(DEMO_MEMBERS);
    expect(missing.length).toBeGreaterThan(5);
    expect(missing.some((x) => x.categoryId === "business_lawyer")).toBe(true);
    expect(missing.every((x) => !DEMO_MEMBERS.some((d) => d.categoryId === x.categoryId))).toBe(true);
  });

  it("inactive members are excluded from chapter intelligence", () => {
    const withInactive = DEMO_MEMBERS.map((x) => (x.id === DEMO_IDS.arjun ? { ...x, status: "inactive" as const } : x));
    expect(bestMatches(m("priya"), withInactive).some((x) => x.member.id === DEMO_IDS.arjun)).toBe(false);
  });

  it("builds a complete one-to-one brief", () => {
    const r = computeCompatibility(m("priya"), m("nisha"));
    const b = meetingBrief(m("priya"), m("nisha"), r, new Date("2026-10-01T00:00:00Z"));
    expect(b.discoveryQuestions).toHaveLength(5);
    expect(b.triggers.length).toBe(3);
    expect(b.followUpDate).toBe("2026-10-15");
    expect(b.icpExchange.a).toContain("manufacturer");
  });
});
