import { describe, expect, it } from "vitest";
import { revenueSummary, type RevenueQuote } from "@/lib/revenue";

const q = (o: Partial<RevenueQuote>): RevenueQuote => ({
  id: "x", rootId: "r", version: 1, clientId: "c", status: "draft", monthlyNet: 0, oneTimeNet: 0, annualNet: 0, industryName: "", offerMonthly: [], ...o,
});

describe("revenue dashboard", () => {
  const base = { targetMonthly: 300_000_00, startingSigned: 25_000_00, startingSignedClients: 1, cashCollected: 10_000_00 };

  it("never counts drafts and keeps signed separate from pipeline", () => {
    const r = revenueSummary({
      ...base,
      quotes: [
        q({ id: "a", rootId: "A", status: "draft", monthlyNet: 99_000_00 }),
        q({ id: "b1", rootId: "B", version: 1, status: "sent", monthlyNet: 40_000_00, oneTimeNet: 50_000_00 }),
        q({ id: "b2", rootId: "B", version: 2, status: "draft", monthlyNet: 45_000_00 }),
        q({ id: "c1", rootId: "C", clientId: "c2", status: "accepted", monthlyNet: 35_000_00, oneTimeNet: 40_000_00, industryName: "Dental clinics", offerMonthly: [{ offerName: "Clinic Patient Engine", monthly: 35_000_00 }] }),
        q({ id: "d1", rootId: "D", status: "rejected", monthlyNet: 20_000_00 }),
        q({ id: "e1", rootId: "E", status: "expired", monthlyNet: 20_000_00 }),
      ],
    });
    expect(r.signedMonthly).toBe(60_000_00);
    expect(r.gap).toBe(240_000_00);
    expect(r.pipelineMonthly).toBe(40_000_00); // issued v1, not the draft v2
    expect(r.pipelineOneTime).toBe(50_000_00);
    expect(r.signedOneTime).toBe(40_000_00);
    expect(r.activeClients).toBe(2);
    expect(r.averagePerClient).toBe(30_000_00);
    expect([r.won, r.lost, r.expired]).toEqual([1, 1, 1]);
    expect(r.byOffer[0]).toEqual({ label: "Clinic Patient Engine", monthly: 35_000_00 });
    expect(r.cashCollected).toBe(10_000_00);
  });

  it("an accepted version stays signed after a later revision", () => {
    const r = revenueSummary({ ...base, quotes: [q({ id: "1", rootId: "R", version: 1, status: "accepted", monthlyNet: 30_000_00 }), q({ id: "2", rootId: "R", version: 2, status: "sent", monthlyNet: 50_000_00 })] });
    expect(r.signedMonthly).toBe(55_000_00);
    expect(r.pipelineMonthly).toBe(0);
  });
});
