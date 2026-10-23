import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../supabase/functions/_shared/engine/index.ts";
import { compatibilityReport, explanationPayload, reidentify, validateSettings, type ChapterData } from "../supabase/functions/_shared/service.ts";
import { DEMO_CHAPTER, DEMO_IDS, DEMO_MEMBERS } from "../supabase/functions/_shared/demo-data.ts";

const data = (suppressed: string[] = []): ChapterData => ({
  chapter: { id: DEMO_CHAPTER.id, name: DEMO_CHAPTER.name, isDemo: true, settings: DEFAULT_SETTINGS },
  members: DEMO_MEMBERS,
  referralStats: [],
  suppressedKeys: suppressed,
});

describe("service layer", () => {
  it("withdrawn recommendations are removed from reports", () => {
    const r = compatibilityReport(data(), DEMO_IDS.priya, DEMO_IDS.arjun);
    const key = r.referrals.aToB[0].id;
    const r2 = compatibilityReport(data([key]), DEMO_IDS.priya, DEMO_IDS.arjun);
    expect(r2.referrals.aToB.some((o) => o.id === key)).toBe(false);
  });

  it("unknown or invisible members return a 404 service error", () => {
    expect(() => compatibilityReport(data(), DEMO_IDS.priya, "00000000-0000-4000-8000-999999999999")).toThrow(/not found/);
  });

  it("LLM payload is de-identified and excludes contact details", () => {
    const d = data();
    const r = compatibilityReport(d, DEMO_IDS.priya, DEMO_IDS.arjun);
    const a = DEMO_MEMBERS.find((m) => m.id === DEMO_IDS.priya)!;
    const b = DEMO_MEMBERS.find((m) => m.id === DEMO_IDS.arjun)!;
    const json = JSON.stringify(explanationPayload(r, a, b));
    for (const s of ["Priya", "Arjun", "Raman", "Mehta", "BrightFunnel", "example.com", "+91", a.id]) expect(json).not.toContain(s);
    expect(reidentify("Member A and Member B", a, b)).toBe("Priya and Arjun");
  });

  it("validates scoring settings", () => {
    expect(validateSettings(DEFAULT_SETTINGS).ok).toBe(true);
    expect(validateSettings({ ...DEFAULT_SETTINGS, bands: [{ min: 50, label: "x" }] }).ok).toBe(false);
    expect(validateSettings({ ...DEFAULT_SETTINGS, weights: { ...DEFAULT_SETTINGS.weights, contact_sphere: 40 } }).errors[0]).toMatch(/100%/);
  });
});
