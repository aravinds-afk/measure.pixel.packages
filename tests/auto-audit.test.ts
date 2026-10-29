import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { consultant, testDb } from "./helpers";
import * as s from "@/server/db/schema";
import type { DB } from "@/server/db";
import type { Fetcher } from "@/server/discovery/fetcher";
import { getSettings } from "@/server/settings";
import { runAutoAudit } from "@/server/services/auto-audit";
import { instagramHandle, summarise } from "@/server/discovery/instagram";

const HOME = `<!doctype html><html><head><title>Bright Smile Dental Clinic | Dentist in Chennai</title>
<meta name="description" content="Root canal, dental implants and braces in Chennai."><meta name="viewport" content="width=device-width"></head>
<body><h1>Your family dentist</h1><a href="tel:+919000000000">Call</a><p>Painless root canal treatment.</p></body></html>`;

const fetcher: Fetcher = async (url) => {
  if (url.endsWith("/robots.txt")) return { url, finalUrl: url, status: 404, contentType: "text/plain", body: "", elapsedMs: 1, truncated: false };
  if (url === "https://brightsmile.example.com/") return { url, finalUrl: url, status: 200, contentType: "text/html", body: HOME, elapsedMs: 1, truncated: false };
  return { url, finalUrl: url, status: 404, contentType: "text/html", body: "", elapsedMs: 1, truncated: false };
};

const now = Date.now();
const apify = (async () =>
  new Response(JSON.stringify([{ username: "brightsmile", biography: "Dental clinic in Chennai. Book via WhatsApp", followersCount: 2000, postsCount: 40, externalUrl: "https://wa.me/919000000000",
    latestPosts: [{ timestamp: new Date(now - 5 * 864e5).toISOString(), likesCount: 10, commentsCount: 1, type: "Image" }, { timestamp: new Date(now - 60 * 864e5).toISOString(), likesCount: 8, commentsCount: 0, type: "Video" }] }]), { status: 200 })) as unknown as typeof fetch;

let db: DB;
let close: () => void;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

describe("automatic audit", () => {
  it("parses Instagram handles", () => {
    expect(instagramHandle("https://www.instagram.com/brightsmile/")).toBe("brightsmile");
    expect(instagramHandle("@bright.smile")).toBe("bright.smile");
    expect(instagramHandle("https://instagram.com/p/abc")).toBeNull();
  });

  it("summarises Instagram activity into audit signals", () => {
    const r = summarise("x", { username: "x", followersCount: 1000, latestPosts: [] });
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.prefill.find((p) => p.itemId === "cc-social-active")?.status).toBe("missing");
  });

  it("goes from links to industry, findings, prescription and a draft quote", async () => {
    process.env.APIFY_TOKEN = "test-token";
    const settings = await getSettings(db);
    const sum = await runAutoAudit(db, consultant, settings, { website: "brightsmile.example.com", instagram: "@brightsmile", linkedin: "", youtube: "", businessName: "", idempotencyKey: "auto-test-0001" }, { fetcher, fetchImpl: apify });
    delete process.env.APIFY_TOKEN;
    expect(sum.website.inspected).toBe(true);
    expect(sum.instagram.status).toBe("ok");
    expect(sum.industryDetected).toBe("dental-clinics");
    expect(sum.verified).toBeGreaterThan(3);
    expect(sum.inferred).toBeGreaterThan(0);
    const [a] = await db.select().from(s.audits).where(eq(s.audits.id, sum.auditId));
    expect(a.responses["cc-social-active"].status).toBe("needs_improvement"); // 1 post in 30 days
    expect(a.responses["an-ga4"].source).toBe("auto-inferred"); // no tag in source: inferred, not verified
    const [c] = await db.select().from(s.clients).where(eq(s.clients.id, sum.clientId));
    expect(c.businessName).toBe("Bright Smile Dental Clinic");
    const recs = await db.select().from(s.recommendations).where(eq(s.recommendations.auditId, sum.auditId));
    expect(recs.some((r) => r.decision === "accepted")).toBe(true);
    expect(sum.quoteId).toBeTruthy();
    // Same request again: no second crawl, same result.
    const again = await runAutoAudit(db, consultant, settings, { website: "brightsmile.example.com", instagram: "@brightsmile", linkedin: "", youtube: "", businessName: "", idempotencyKey: "auto-test-0001" }, { fetcher: async () => { throw new Error("should not crawl"); } });
    expect(again.quoteId).toBe(sum.quoteId);
    expect((await db.select().from(s.quotes)).length).toBe(1);
  });

  it("reports Instagram as not configured without an Apify token", async () => {
    const settings = await getSettings(db);
    const sum = await runAutoAudit(db, consultant, settings, { website: "", instagram: "@someone", linkedin: "", youtube: "", businessName: "Someone", idempotencyKey: "auto-test-0002" });
    expect(sum.instagram.status).toBe("not_configured");
    expect(sum.website.inspected).toBe(false);
  });
});
