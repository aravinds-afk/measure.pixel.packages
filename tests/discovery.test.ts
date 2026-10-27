import { describe, expect, it } from "vitest";
import { isPublicAddress, normalisePublicUrl } from "@/server/discovery/url-guard";
import { parseRobots } from "@/server/discovery/robots";
import { discover } from "@/server/discovery/analyze";
import type { Fetcher } from "@/server/discovery/fetcher";
import { applyDiscovery } from "@/server/services/audits";
import { INDUSTRY_KEYWORDS } from "@/data/defaults";
import { INDUSTRIES } from "@/data/opportunity-board";

describe("SSRF guard", () => {
  it.each(["http://localhost", "http://127.0.0.1", "http://10.1.2.3", "http://169.254.169.254/latest/meta-data", "http://[::1]", "http://[::ffff:192.168.1.1]", "http://printer.local", "ftp://example.com", "http://user:pw@example.com", "http://example.com:8080", "http://intranet"])(
    "rejects %s",
    (u) => expect(() => normalisePublicUrl(u)).toThrow(),
  );
  it("accepts public sites and adds https", () => {
    expect(normalisePublicUrl("measurepixel.com").toString()).toBe("https://measurepixel.com/");
    expect(normalisePublicUrl("http://example.com/a#x").toString()).toBe("http://example.com/a");
  });
  it("classifies addresses", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("100.64.0.1")).toBe(false);
    expect(isPublicAddress("172.31.255.255")).toBe(false);
    expect(isPublicAddress("2606:4700::1111")).toBe(true);
    expect(isPublicAddress("fd00::1")).toBe(false);
    expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicAddress("64:ff9b::10.0.0.1")).toBe(false);
  });
});

describe("robots.txt", () => {
  const txt = `User-agent: *\nDisallow: /private\nAllow: /private/ok\n\nUser-agent: BadBot\nDisallow: /`;
  it("applies longest match", () => {
    const r = parseRobots(txt, "MeasurePixelGrowthAdvisor/1.0");
    expect(r.isAllowed("/")).toBe(true);
    expect(r.isAllowed("/private/x")).toBe(false);
    expect(r.isAllowed("/private/ok/1")).toBe(true);
  });
  it("supports wildcards and $", () => {
    const r = parseRobots("User-agent: *\nDisallow: /*.pdf$", "x");
    expect(r.isAllowed("/a.pdf")).toBe(false);
    expect(r.isAllowed("/a.pdf?x")).toBe(true);
  });
});

const HOME = `<!doctype html><html lang="en"><head>
<title>Smile Dental Care | Best Dentist in Pune</title>
<meta name="description" content="Painless root canal and dental implants in Pune.">
<meta name="viewport" content="width=device-width">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234567"></script>
<script>fbq('init', '123');</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Dentist","name":"Smile"}</script>
</head><body><header><nav><a href="/services">Treatments</a><a href="/contact">Contact</a></nav></header>
<h1>Gentle dental care for the whole family</h1>
<a href="https://wa.me/919999999999">Chat on WhatsApp</a><a href="tel:+91 99999 99999">Call now</a>
<a href="https://www.instagram.com/smiledental/">Instagram</a>
<section><h2>What our patients say</h2><p>Testimonials here</p></section>
</body></html>`;
const CONTACT = `<html><head><title>Contact</title></head><body><form action="/send"><input name="name"><input name="phone"><textarea name="message"></textarea><button>Book appointment</button></form></body></html>`;

const fakeFetcher = (pages: Record<string, { status: number; body: string; type?: string }>): Fetcher => async (url) => {
  const p = pages[url];
  if (!p) return { url, finalUrl: url, status: 404, contentType: "text/html", body: "", elapsedMs: 1, truncated: false };
  return { url, finalUrl: url, status: p.status, contentType: p.type ?? "text/html", body: p.body, elapsedMs: 1, truncated: false };
};
const industries = INDUSTRIES.map((i) => ({ id: i.id, name: i.name, keywords: INDUSTRY_KEYWORDS[i.id] ?? [] }));

describe("discovery", () => {
  it("extracts verified facts, suggestions and industry inference", async () => {
    const r = await discover({ website: "smiledental.example.com", instagram: "https://instagram.com/smiledental" }, industries, {
      delayMs: 0,
      fetcher: fakeFetcher({
        "https://smiledental.example.com/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /admin", type: "text/plain" },
        "https://smiledental.example.com/": { status: 200, body: HOME },
        "https://smiledental.example.com/contact": { status: 200, body: CONTACT },
        "https://smiledental.example.com/services": { status: 200, body: "<html><body><h1>Treatments</h1></body></html>" },
      }),
    });
    expect(r.error).toBeUndefined();
    expect(r.businessNameCandidate).toBe("Smile Dental Care");
    expect(r.tracking.ga4).toEqual(["G-ABC1234567"]);
    expect(r.tracking.metaPixel).toBe(true);
    expect(r.contact.whatsapp[0]).toContain("wa.me");
    expect(r.industrySuggestions[0].industryId).toBe("dental-clinics");
    const pf = Object.fromEntries(r.prefill.map((p) => [p.itemId, p]));
    expect(pf["lc-forms"].status).toBe("working_well");
    expect(pf["an-ga4"].status).toBe("working_well");
    expect(pf["seo-schema"].status).toBe("working_well");
    // Tag presence is not proof that ads run: suggestion only.
    expect(pf["pa-meta-ads"].status).toBeNull();
    expect(pf["pa-meta-ads"].suggestion?.status).toBe("working_well");
    expect(r.manualChecks.find((m) => m.platform === "Instagram")!.note).toMatch(/Not fetched automatically/);
    expect(r.observations.some((o) => o.kind === "unknown" && /Ad spend/.test(o.text))).toBe(true);

    // Applying never overrides the consultant
    const applied = applyDiscovery({ "lc-forms": { status: "missing", source: "consultant" } }, r);
    expect(applied["lc-forms"].status).toBe("missing");
    expect(applied["an-ga4"].status).toBe("working_well");
    expect(applied["an-ga4"].source).toBe("auto-verified");
  });

  it("does not mark items missing when the site is unreachable", async () => {
    const failing: Fetcher = async () => {
      throw Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } });
    };
    const r = await discover({ website: "nope.example.com" }, industries, { fetcher: failing, delayMs: 0 });
    expect(r.error).toMatch(/could not be/);
    expect(r.prefill).toEqual([]);
  });

  it("respects a robots.txt that blocks everything", async () => {
    const r = await discover({ website: "blocked.example.com" }, industries, {
      delayMs: 0,
      fetcher: fakeFetcher({ "https://blocked.example.com/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /", type: "text/plain" } }),
    });
    expect(r.robots).toBe("blocked-home");
    expect(r.pages).toEqual([]);
  });
});
