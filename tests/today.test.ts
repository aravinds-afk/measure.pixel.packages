import { describe, expect, it } from "vitest";
import { INDUSTRIES } from "@/data/opportunity-board";
import { activeSeasons, pace, planPosition, tasksFor, topThree } from "@/lib/today";
import { localToday } from "@/server/services/today";

const names = Object.fromEntries(INDUSTRIES.map((i) => [i.id, i.name]));

describe("morning plan", () => {
  it("positions the 90-day plan", () => {
    expect(planPosition("2026-10-29")).toMatchObject({ day: 1, week: 1 });
    expect(planPosition("2026-10-29").phase.id).toBe("foundation");
    expect(planPosition("2026-12-20").phase.id).toBe("close");
    expect(planPosition("2027-01-26")).toMatchObject({ day: 90, daysLeft: 1 });
  });

  it("knows the season", () => {
    const oct = activeSeasons("2026-10-29").map((s) => s.id);
    expect(oct).toContain("festive-wedding");
    expect(oct).not.toContain("admissions");
    const jan = activeSeasons("2027-01-10").map((s) => s.id);
    expect(jan).toEqual(expect.arrayContaining(["admissions", "launches", "budget-cycle", "new-year-fitness", "festive-wedding"]));
    expect(jan.at(-1)).toBe("healthcare"); // year-round season ranks last
  });

  it("builds a day with rhythm, non-negotiables, events and pipeline items", () => {
    const thu = tasksFor("2026-10-29", names); // Thursday
    expect(thu.some((t) => t.channel === "BNI")).toBe(true);
    expect(thu.some((t) => t.key === "daily-conversation")).toBe(true);
    expect(thu.every((t) => !t.text.includes("{"))).toBe(true);
    const pongal = tasksFor("2027-01-14", names);
    expect(pongal[0].text).toMatch(/Pongal today/);
    const withPipeline = tasksFor("2026-11-02", names, {
      followUpsDue: [{ clientId: "c1", clientName: "Smile Dental", date: "2026-11-01" }],
      expiringQuotes: [{ quoteId: "q1", number: "MPQ-2026-0001", clientName: "Smile Dental", validUntil: "2026-11-03" }],
      staleDrafts: [], auditsWithoutQuote: [],
    });
    const top = topThree(withPipeline);
    expect(top[0].text).toMatch(/expires/);
    expect(top[1].text).toMatch(/Follow up/);
  });

  it("computes the pace to the target", () => {
    const p = pace({ gap: 275_000_00, avgRetainer: 50_000_00, closeRate: 0.2, today: "2026-10-29", targetDate: "2027-01-23" });
    expect(p.clientsNeeded).toBe(6);
    expect(p.conversationsNeeded).toBe(30);
    expect(p.weeksLeft).toBe(13);
    expect(p.perWeek).toBe(3);
  });

  it("uses the India calendar date", () => {
    expect(localToday("Asia/Kolkata", new Date("2026-10-28T20:00:00Z"))).toBe("2026-10-29");
  });
});
