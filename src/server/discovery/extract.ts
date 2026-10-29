import * as cheerio from "cheerio";

/** Facts read directly from one HTML page. Everything here is observed, not inferred. */
export type PageFacts = {
  url: string;
  title: string;
  metaDescription: string;
  canonical: string;
  lang: string;
  hasViewport: boolean;
  h1: string[];
  h2: string[];
  ogSiteName: string;
  ogTitle: string;
  navLinks: { text: string; href: string }[];
  internalLinks: { text: string; href: string }[];
  ctas: string[];
  forms: { fields: string[]; action: string }[];
  phones: string[];
  emails: string[];
  whatsapp: string[];
  social: Record<"instagram" | "facebook" | "linkedin" | "youtube" | "x", string[]>;
  tracking: { ga4: string[]; gtm: string[]; ua: string[]; googleAds: string[]; metaPixel: boolean; linkedinInsight: boolean; clarity: boolean; hotjar: boolean };
  structuredDataTypes: string[];
  testimonialSignals: string[];
  videoEmbeds: number;
  images: number;
  imagesWithAlt: number;
  wordCount: number;
  textSample: string;
};

const CTA_WORDS = /\b(book|call|contact|enquire|enquiry|inquire|get (a )?(quote|started|free)|schedule|appointment|consult|apply|register|sign ?up|buy|order|request|whatsapp|chat|download|talk to)\b/i;
const TESTIMONIAL_WORDS = /\b(testimonials?|reviews?|what (our )?(clients|customers|patients|students|parents) say|success stories|case stud(y|ies)|rated \d|google rating|★)/i;

export function extractPage(html: string, pageUrl: string): PageFacts {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const text = (s: string) => s.replace(/\s+/g, " ").trim();
  const abs = (href: string) => {
    try {
      return new URL(href, base).toString();
    } catch {
      return "";
    }
  };

  // Script/inline content for tag detection (read before removing scripts).
  const scriptBlob = $("script").map((_, el) => ($(el).attr("src") ?? "") + " " + $(el).html()).get().join("\n") + "\n" + $("noscript").html();
  const ga4 = uniq([...scriptBlob.matchAll(/\b(G-[A-Z0-9]{6,12})\b/g)].map((m) => m[1]));
  const gtm = uniq([...(scriptBlob + html).matchAll(/\b(GTM-[A-Z0-9]{4,9})\b/g)].map((m) => m[1]));
  const ua = uniq([...scriptBlob.matchAll(/\b(UA-\d{4,10}-\d{1,4})\b/g)].map((m) => m[1]));
  const googleAds = uniq([...scriptBlob.matchAll(/\b(AW-\d{6,12})\b/g)].map((m) => m[1]));
  const metaPixel = /fbq\(\s*['"]init['"]|connect\.facebook\.net\/[^"']*\/fbevents\.js/.test(scriptBlob);
  const linkedinInsight = /snap\.licdn\.com|_linkedin_partner_id/.test(scriptBlob);
  const clarity = /clarity\.ms/.test(scriptBlob);
  const hotjar = /static\.hotjar\.com|hjid/.test(scriptBlob);

  const structuredDataTypes = uniq(
    $('script[type="application/ld+json"]')
      .map((_, el) => {
        try {
          const data = JSON.parse($(el).html() ?? "");
          return collectTypes(data);
        } catch {
          return [];
        }
      })
      .get()
      .flat(),
  );

  const links = $("a[href]")
    .map((_, el) => ({ text: text($(el).text()) || text($(el).attr("aria-label") ?? ""), href: $(el).attr("href") ?? "" }))
    .get();

  const phones = uniq(links.filter((l) => l.href.startsWith("tel:")).map((l) => decodeURIComponent(l.href.slice(4)).replace(/[^\d+]/g, "")));
  const emails = uniq(links.filter((l) => l.href.startsWith("mailto:")).map((l) => decodeURIComponent(l.href.slice(7)).split("?")[0].toLowerCase()));
  const whatsapp = uniq(links.filter((l) => /(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp:\/\/)/i.test(l.href)).map((l) => abs(l.href) || l.href));

  const socialPatterns: [keyof PageFacts["social"], RegExp][] = [
    ["instagram", /^https?:\/\/(www\.)?instagram\.com\/(?!p\/|reel\/|explore\/)[^/?#]+/i],
    ["facebook", /^https?:\/\/(www\.|m\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr)[^/?#]+/i],
    ["linkedin", /^https?:\/\/(www\.)?linkedin\.com\/(company|in|school)\/[^/?#]+/i],
    ["youtube", /^https?:\/\/(www\.)?youtube\.com\/(@[^/?#]+|channel\/[^/?#]+|c\/[^/?#]+|user\/[^/?#]+)/i],
    ["x", /^https?:\/\/(www\.)?(twitter|x)\.com\/(?!intent|share|home)[^/?#]+/i],
  ];
  const social = { instagram: [], facebook: [], linkedin: [], youtube: [], x: [] } as PageFacts["social"];
  for (const l of links) {
    const href = abs(l.href);
    for (const [k, re] of socialPatterns) {
      const m = href.match(re);
      if (m) social[k].push(m[0]);
    }
  }
  for (const k of Object.keys(social) as (keyof typeof social)[]) social[k] = uniq(social[k]);

  const internalLinks = uniq(
    links
      .map((l) => ({ text: l.text, href: abs(l.href) }))
      .filter((l) => {
        if (!l.href) return false;
        const u = new URL(l.href);
        return (u.protocol === "http:" || u.protocol === "https:") && sameSite(u.hostname, base.hostname);
      })
      .map((l) => JSON.stringify({ text: l.text.slice(0, 80), href: l.href.split("#")[0] })),
  ).map((s) => JSON.parse(s) as { text: string; href: string });

  const navLinks = $("nav a[href], header a[href]")
    .map((_, el) => ({ text: text($(el).text()), href: abs($(el).attr("href") ?? "") }))
    .get()
    .filter((l) => l.text && l.text.length < 60);

  const ctas = uniq(
    $("a, button, input[type=submit]")
      .map((_, el) => text($(el).text() || $(el).attr("value") || $(el).attr("aria-label") || ""))
      .get()
      .filter((t) => t.length > 1 && t.length < 50 && CTA_WORDS.test(t)),
  ).slice(0, 15);

  const forms = $("form")
    .map((_, el) => ({
      action: $(el).attr("action") ?? "",
      fields: $(el)
        .find("input, textarea, select")
        .map((__, f) => ($(f).attr("type") === "hidden" ? "" : $(f).attr("name") || $(f).attr("placeholder") || $(f).attr("type") || f.tagName))
        .get()
        .filter(Boolean)
        .slice(0, 12),
    }))
    .get()
    .filter((f) => f.fields.length > 0 && !/search/i.test(f.action + f.fields.join(" ")));

  const videoEmbeds = $('iframe[src*="youtube"], iframe[src*="vimeo"], video').length;
  const images = $("img").length;
  const imagesWithAlt = $("img[alt]").filter((_, el) => text($(el).attr("alt") ?? "").length > 0).length;

  $("script, style, noscript, svg, template").remove();
  const bodyText = text($("body").text());
  const testimonialSignals = uniq([...bodyText.matchAll(new RegExp(TESTIMONIAL_WORDS, "gi"))].map((m) => m[0].toLowerCase())).slice(0, 6);

  return {
    url: pageUrl,
    title: text($("title").first().text()),
    metaDescription: text($('meta[name="description"]').attr("content") ?? ""),
    canonical: $('link[rel="canonical"]').attr("href") ?? "",
    lang: $("html").attr("lang") ?? "",
    hasViewport: $('meta[name="viewport"]').length > 0,
    h1: $("h1").map((_, el) => text($(el).text())).get().filter(Boolean).slice(0, 5),
    h2: $("h2").map((_, el) => text($(el).text())).get().filter(Boolean).slice(0, 20),
    ogSiteName: $('meta[property="og:site_name"]').attr("content") ?? "",
    ogTitle: $('meta[property="og:title"]').attr("content") ?? "",
    navLinks: navLinks.slice(0, 40),
    internalLinks: internalLinks.slice(0, 200),
    ctas,
    forms,
    phones,
    emails,
    whatsapp,
    social,
    tracking: { ga4, gtm, ua, googleAds, metaPixel, linkedinInsight, clarity, hotjar },
    structuredDataTypes,
    testimonialSignals,
    videoEmbeds,
    images,
    imagesWithAlt,
    wordCount: bodyText ? bodyText.split(" ").length : 0,
    textSample: bodyText.slice(0, 6000),
  };
}

function collectTypes(data: unknown): string[] {
  if (Array.isArray(data)) return data.flatMap(collectTypes);
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const own = o["@type"] ? ([] as string[]).concat(o["@type"] as string | string[]) : [];
    const graph = o["@graph"] ? collectTypes(o["@graph"]) : [];
    return [...own, ...graph];
  }
  return [];
}

export function sameSite(a: string, b: string) {
  const strip = (h: string) => h.toLowerCase().replace(/^www\./, "");
  return strip(a) === strip(b);
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
