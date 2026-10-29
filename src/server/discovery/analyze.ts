import { describeFetchError, safeFetch, USER_AGENT, type Fetcher } from "./fetcher";
import { extractPage, type PageFacts } from "./extract";
import { allowAll, disallowAll, parseRobots, type Robots } from "./robots";
import { normalisePublicUrl, UnsafeUrlError } from "./url-guard";

/**
 * Public-website discovery. Fetches the homepage plus a few relevant internal
 * pages (robots.txt permitting) and turns the facts into:
 *  - observations, each tagged verified / inference / unknown,
 *  - audit prefill: a status only when the page itself proves it, otherwise a
 *    suggestion the consultant can accept or ignore.
 * Social platforms are never scraped; they are listed for manual review.
 */

export type ObservationKind = "verified" | "inference" | "unknown";
export type Observation = { kind: ObservationKind; area: string; text: string; evidenceUrl?: string };
export type Prefill = {
  itemId: string;
  /** Set only when the evidence is conclusive. */
  status: "working_well" | "needs_improvement" | "missing" | null;
  suggestion: { status: "working_well" | "needs_improvement" | "missing"; note: string } | null;
  evidence: string;
  evidenceUrl?: string;
};

export type DiscoveryResult = {
  inputUrl: string;
  finalUrl: string | null;
  fetchedAt: string;
  robots: Robots["status"] | "blocked-home";
  pages: { url: string; status: number | null; ok: boolean; title?: string; note?: string }[];
  businessNameCandidate: string;
  description: string;
  headings: string[];
  possibleServices: string[];
  contact: { phones: string[]; emails: string[]; whatsapp: string[] };
  socialFound: Record<string, string[]>;
  tracking: PageFacts["tracking"];
  ctas: string[];
  structuredDataTypes: string[];
  observations: Observation[];
  prefill: Prefill[];
  industrySuggestions: { industryId: string; name: string; matched: string[] }[];
  manualChecks: { platform: string; url: string | null; note: string }[];
  error?: string;
};

export type DiscoveryInput = {
  website: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  otherLinks?: string[];
};

type IndustryKw = { id: string; name: string; keywords: string[] };

const PRIORITY_PATH = /(contact|about|service|treatment|course|program|product|solution|pricing|package|admission|speciali)/i;
const LOCAL_BUSINESS_TYPES = /(LocalBusiness|Organization|MedicalClinic|Dentist|Physician|Hospital|EducationalOrganization|School|CollegeOrUniversity|RealEstateAgent|LegalService|AccountingService|Restaurant|Hotel|LodgingBusiness|HomeAndConstructionBusiness|ProfessionalService|Store|AutoDealer|HealthAndBeautyBusiness|SportsActivityLocation|TravelAgency)/;

export async function discover(
  input: DiscoveryInput,
  industries: IndustryKw[],
  opts: { fetcher?: Fetcher; maxPages?: number; delayMs?: number; budgetMs?: number } = {},
): Promise<DiscoveryResult> {
  const fetcher = opts.fetcher ?? safeFetch;
  const maxPages = opts.maxPages ?? 5;
  const delayMs = opts.delayMs ?? 400;
  const deadline = Date.now() + (opts.budgetMs ?? 30_000);

  const result: DiscoveryResult = {
    inputUrl: input.website,
    finalUrl: null,
    fetchedAt: new Date().toISOString(),
    robots: "none",
    pages: [],
    businessNameCandidate: "",
    description: "",
    headings: [],
    possibleServices: [],
    contact: { phones: [], emails: [], whatsapp: [] },
    socialFound: {},
    tracking: { ga4: [], gtm: [], ua: [], googleAds: [], metaPixel: false, linkedinInsight: false, clarity: false, hotjar: false },
    ctas: [],
    structuredDataTypes: [],
    observations: [],
    prefill: [],
    industrySuggestions: [],
    manualChecks: [],
  };

  result.manualChecks = manualSocialChecks(input);
  result.observations.push(
    { kind: "unknown", area: "Performance", text: "Ad spend, campaign performance, revenue and conversion rates cannot be determined from a public website. Ask the client." },
    { kind: "unknown", area: "Visibility", text: "Google Business Profile, Maps ranking and review volume were not inspected automatically. Check on Google Maps." },
  );

  if (!input.website.trim()) {
    result.error = "No website provided";
    return result;
  }

  let home: URL;
  try {
    home = normalisePublicUrl(input.website);
  } catch (e) {
    result.error = e instanceof UnsafeUrlError ? e.message : "Invalid website address";
    return result;
  }

  // robots.txt — 4xx: no restrictions; 5xx/unreachable: treat as disallow-all (RFC 9309).
  let robots: Robots = allowAll;
  try {
    const r = await fetcher(new URL("/robots.txt", home).toString(), { maxBytes: 200_000, timeoutMs: 6000, accept: "text/plain,*/*" });
    if (r.status >= 200 && r.status < 300) robots = parseRobots(r.body, USER_AGENT);
    else if (r.status >= 500) robots = disallowAll;
  } catch (e) {
    const reason = describeFetchError(e);
    if (reason === "Domain could not be resolved" || e instanceof UnsafeUrlError) {
      result.error = `Website could not be reached: ${reason}`;
      result.pages.push({ url: home.toString(), status: null, ok: false, note: reason });
      result.observations.push({ kind: "unknown", area: "Website", text: `The website could not be inspected (${reason}). Findings must be gathered manually.` });
      return result;
    }
    robots = disallowAll;
  }
  result.robots = robots.status;

  if (!robots.isAllowed(home.pathname || "/")) {
    result.robots = "blocked-home";
    result.error = "robots.txt does not allow automated access to this website";
    result.observations.push({ kind: "unknown", area: "Website", text: "The site's robots.txt disallows automated access, so no pages were fetched. Review the site manually with the client." });
    return result;
  }

  const facts: PageFacts[] = [];
  const queue: string[] = [home.toString()];
  const seen = new Set<string>();
  while (queue.length && facts.length < maxPages && Date.now() < deadline) {
    const url = queue.shift()!;
    const key = url.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const path = new URL(url).pathname;
    if (!robots.isAllowed(path)) {
      result.pages.push({ url, status: null, ok: false, note: "Skipped: disallowed by robots.txt" });
      continue;
    }
    if (facts.length > 0) await sleep(delayMs);
    try {
      const r = await fetcher(url, { timeoutMs: Math.max(3000, Math.min(10_000, deadline - Date.now())) });
      const isHtml = /html/i.test(r.contentType) || /^\s*<(!doctype|html)/i.test(r.body);
      if (r.status >= 400 || !isHtml) {
        result.pages.push({ url, status: r.status, ok: false, note: r.status >= 400 ? `HTTP ${r.status}` : "Not an HTML page" });
        if (facts.length === 0) break;
        continue;
      }
      const f = extractPage(r.body, r.finalUrl);
      facts.push(f);
      result.pages.push({ url: r.finalUrl, status: r.status, ok: true, title: f.title, note: r.truncated ? "Page truncated at size limit" : undefined });
      if (facts.length === 1) {
        result.finalUrl = r.finalUrl;
        const candidates = f.internalLinks
          .filter((l) => PRIORITY_PATH.test(new URL(l.href).pathname) || PRIORITY_PATH.test(l.text))
          .map((l) => l.href)
          .filter((h) => !/\.(pdf|jpg|jpeg|png|gif|webp|zip|docx?)$/i.test(h));
        queue.push(...[...new Set(candidates)].slice(0, maxPages * 2));
      }
    } catch (e) {
      result.pages.push({ url, status: null, ok: false, note: describeFetchError(e) });
      if (facts.length === 0) break;
    }
  }

  if (facts.length === 0) {
    const note = result.pages[0]?.note ?? "No pages could be fetched";
    result.error = `Website could not be inspected: ${note}`;
    result.observations.push({ kind: "unknown", area: "Website", text: `The homepage could not be fetched (${note}). Nothing about the website has been verified.` });
    return result;
  }

  summarise(result, facts, industries);
  return result;
}

function summarise(result: DiscoveryResult, facts: PageFacts[], industries: IndustryKw[]) {
  const homeFacts = facts[0];
  const obs = result.observations;
  const pagesLabel = `${facts.length} page${facts.length > 1 ? "s" : ""} inspected`;
  const where = (pred: (f: PageFacts) => boolean) => facts.find(pred);
  const all = <T>(get: (f: PageFacts) => T[]) => [...new Set(facts.flatMap(get))];

  result.businessNameCandidate = (homeFacts.ogSiteName || homeFacts.title.split(/\s[|–—-]\s/)[0] || homeFacts.h1[0] || "").trim().slice(0, 120);
  result.description = homeFacts.metaDescription || "";
  result.headings = [...homeFacts.h1, ...homeFacts.h2].slice(0, 12);
  result.possibleServices = [...new Set([...homeFacts.navLinks.map((l) => l.text), ...homeFacts.h2])].filter((t) => t.length > 2 && t.length < 50).slice(0, 20);
  result.contact = { phones: all((f) => f.phones), emails: all((f) => f.emails), whatsapp: all((f) => f.whatsapp) };
  result.socialFound = Object.fromEntries((["instagram", "facebook", "linkedin", "youtube", "x"] as const).map((k) => [k, all((f) => f.social[k])]));
  result.tracking = {
    ga4: all((f) => f.tracking.ga4),
    gtm: all((f) => f.tracking.gtm),
    ua: all((f) => f.tracking.ua),
    googleAds: all((f) => f.tracking.googleAds),
    metaPixel: facts.some((f) => f.tracking.metaPixel),
    linkedinInsight: facts.some((f) => f.tracking.linkedinInsight),
    clarity: facts.some((f) => f.tracking.clarity),
    hotjar: facts.some((f) => f.tracking.hotjar),
  };
  result.ctas = all((f) => f.ctas).slice(0, 12);
  result.structuredDataTypes = all((f) => f.structuredDataTypes);

  const home = homeFacts.url;
  const https = new URL(result.finalUrl ?? home).protocol === "https:";

  // ---- Verified observations
  if (homeFacts.title) obs.push({ kind: "verified", area: "SEO", text: `Homepage title: “${homeFacts.title}”`, evidenceUrl: home });
  if (homeFacts.metaDescription) obs.push({ kind: "verified", area: "SEO", text: `Meta description: “${homeFacts.metaDescription.slice(0, 200)}”`, evidenceUrl: home });
  else obs.push({ kind: "verified", area: "SEO", text: "Homepage has no meta description.", evidenceUrl: home });
  if (homeFacts.h1.length) obs.push({ kind: "verified", area: "Positioning", text: `Main headline (H1): “${homeFacts.h1[0]}”`, evidenceUrl: home });
  else obs.push({ kind: "verified", area: "Positioning", text: "Homepage has no H1 headline.", evidenceUrl: home });
  obs.push({ kind: "verified", area: "Website", text: https ? "Served over HTTPS." : "Served over plain HTTP (not secure).", evidenceUrl: result.finalUrl ?? home });
  if (!homeFacts.hasViewport) obs.push({ kind: "verified", area: "Website", text: "No mobile viewport tag on the homepage — likely not mobile-optimised.", evidenceUrl: home });
  const formPage = where((f) => f.forms.length > 0);
  if (formPage) obs.push({ kind: "verified", area: "Lead capture", text: `Enquiry form found (fields: ${formPage.forms[0].fields.slice(0, 6).join(", ")}).`, evidenceUrl: formPage.url });
  if (result.contact.whatsapp.length) obs.push({ kind: "verified", area: "Lead capture", text: "WhatsApp chat link present.", evidenceUrl: where((f) => f.whatsapp.length > 0)?.url });
  if (result.contact.phones.length) obs.push({ kind: "verified", area: "Lead capture", text: `Click-to-call number: ${result.contact.phones.slice(0, 2).join(", ")}`, evidenceUrl: where((f) => f.phones.length > 0)?.url });
  if (result.contact.emails.length) obs.push({ kind: "verified", area: "Lead capture", text: `Email link: ${result.contact.emails.slice(0, 2).join(", ")}` });
  if (result.ctas.length) obs.push({ kind: "verified", area: "Website", text: `Calls to action seen: ${result.ctas.slice(0, 6).map((c) => `“${c}”`).join(", ")}` });
  const t = result.tracking;
  if (t.ga4.length) obs.push({ kind: "verified", area: "Measurement", text: `GA4 tag in page source: ${t.ga4.join(", ")}` });
  if (t.gtm.length) obs.push({ kind: "verified", area: "Measurement", text: `Google Tag Manager container: ${t.gtm.join(", ")}` });
  if (t.ua.length) obs.push({ kind: "verified", area: "Measurement", text: `Legacy Universal Analytics ID still in code: ${t.ua.join(", ")} (UA stopped processing data in 2023).` });
  if (t.googleAds.length) obs.push({ kind: "verified", area: "Advertising", text: `Google Ads tag in page source: ${t.googleAds.join(", ")}` });
  if (t.metaPixel) obs.push({ kind: "verified", area: "Advertising", text: "Meta Pixel code in page source." });
  if (t.linkedinInsight) obs.push({ kind: "verified", area: "Advertising", text: "LinkedIn Insight tag in page source." });
  if (t.clarity || t.hotjar) obs.push({ kind: "verified", area: "Measurement", text: `Behaviour analytics: ${[t.clarity && "Microsoft Clarity", t.hotjar && "Hotjar"].filter(Boolean).join(", ")}` });
  if (result.structuredDataTypes.length) obs.push({ kind: "verified", area: "SEO", text: `Structured data types: ${result.structuredDataTypes.slice(0, 6).join(", ")}` });
  for (const [k, urls] of Object.entries(result.socialFound)) if (urls.length) obs.push({ kind: "verified", area: "Social", text: `${cap(k)} profile linked from site: ${urls[0]}` });
  const videoPage = where((f) => f.videoEmbeds > 0);
  if (videoPage) obs.push({ kind: "verified", area: "Content", text: "Embedded video found on the site.", evidenceUrl: videoPage.url });
  const testimonialPage = where((f) => f.testimonialSignals.length > 0);
  if (testimonialPage) obs.push({ kind: "inference", area: "Trust", text: `Possible testimonials/reviews section (“${testimonialPage.testimonialSignals[0]}”). Check quality manually.`, evidenceUrl: testimonialPage.url });

  // ---- Inferences from absence (limited crawl ⇒ never conclusive)
  if (!formPage) obs.push({ kind: "inference", area: "Lead capture", text: `No enquiry form found on the ${pagesLabel}. It may use a pop-up or third-party widget.` });
  if (!t.ga4.length && !t.gtm.length) obs.push({ kind: "inference", area: "Measurement", text: `No GA4 or GTM tag found in page source on the ${pagesLabel}. Tags injected by plugins or consent tools can be missed — confirm in GA4.` });
  if (!t.googleAds.length && !t.metaPixel) obs.push({ kind: "inference", area: "Advertising", text: "No Google Ads or Meta tracking tags seen. If the client runs ads, conversions are probably not being tracked." });

  // ---- Prefill
  const pf = result.prefill;
  pf.push({ itemId: "wc-https", status: https ? "working_well" : "needs_improvement", suggestion: null, evidence: https ? "Site loads over HTTPS" : "Site loads over plain HTTP", evidenceUrl: result.finalUrl ?? home });
  if (!homeFacts.hasViewport) pf.push({ itemId: "wc-mobile", status: "needs_improvement", suggestion: null, evidence: "No viewport meta tag on homepage", evidenceUrl: home });
  else pf.push({ itemId: "wc-mobile", status: null, suggestion: null, evidence: "Viewport tag present — check the layout on a phone", evidenceUrl: home });
  if (homeFacts.title && homeFacts.metaDescription) pf.push({ itemId: "seo-onpage", status: "working_well", suggestion: null, evidence: "Homepage has a title and meta description", evidenceUrl: home });
  else pf.push({ itemId: "seo-onpage", status: "needs_improvement", suggestion: null, evidence: `Homepage missing ${!homeFacts.title ? "title" : "meta description"}`, evidenceUrl: home });
  if (result.structuredDataTypes.some((x) => LOCAL_BUSINESS_TYPES.test(x))) pf.push({ itemId: "seo-schema", status: "working_well", suggestion: null, evidence: `Structured data: ${result.structuredDataTypes.join(", ")}` });
  else pf.push({ itemId: "seo-schema", status: null, suggestion: { status: "missing", note: `No business structured data on the ${pagesLabel}` }, evidence: "" });
  if (formPage) pf.push({ itemId: "lc-forms", status: "working_well", suggestion: null, evidence: "Enquiry form found", evidenceUrl: formPage.url });
  else pf.push({ itemId: "lc-forms", status: null, suggestion: { status: "missing", note: `No form on the ${pagesLabel}` }, evidence: "" });
  if (result.contact.whatsapp.length) pf.push({ itemId: "lc-whatsapp", status: "working_well", suggestion: null, evidence: "WhatsApp link on site", evidenceUrl: where((f) => f.whatsapp.length > 0)?.url });
  else pf.push({ itemId: "lc-whatsapp", status: null, suggestion: { status: "missing", note: `No WhatsApp link on the ${pagesLabel}` }, evidence: "" });
  if (result.contact.phones.length) pf.push({ itemId: "lc-click-to-call", status: "working_well", suggestion: null, evidence: "tel: link on site", evidenceUrl: where((f) => f.phones.length > 0)?.url });
  else pf.push({ itemId: "lc-click-to-call", status: null, suggestion: { status: "missing", note: `No click-to-call link on the ${pagesLabel}` }, evidence: "" });
  if (t.ga4.length) pf.push({ itemId: "an-ga4", status: "working_well", suggestion: null, evidence: `GA4 ${t.ga4.join(", ")} in page source` });
  else pf.push({ itemId: "an-ga4", status: null, suggestion: { status: "missing", note: t.gtm.length ? "No GA4 ID in source; may be configured inside GTM — confirm" : `No GA4 tag on the ${pagesLabel}` }, evidence: "" });
  if (t.gtm.length) pf.push({ itemId: "an-gtm", status: "working_well", suggestion: null, evidence: `GTM ${t.gtm.join(", ")}` });
  else pf.push({ itemId: "an-gtm", status: null, suggestion: { status: "missing", note: "No GTM container found" }, evidence: "" });
  if (t.googleAds.length) pf.push({ itemId: "pa-google-ads", status: null, suggestion: { status: "working_well", note: "Google Ads tag found — account likely exists; confirm campaigns are live" }, evidence: t.googleAds.join(", ") });
  if (t.metaPixel) pf.push({ itemId: "pa-meta-ads", status: null, suggestion: { status: "working_well", note: "Meta Pixel found — confirm whether ads are running" }, evidence: "fbq init in page source" });
  if (t.linkedinInsight) pf.push({ itemId: "pa-linkedin", status: null, suggestion: { status: "working_well", note: "LinkedIn Insight tag found — confirm campaigns" }, evidence: "LinkedIn Insight tag" });
  if (videoPage) pf.push({ itemId: "cc-video", status: null, suggestion: { status: "working_well", note: "Video embedded on site — judge quality" }, evidence: "Video embed", evidenceUrl: videoPage.url });
  if (testimonialPage) pf.push({ itemId: "bp-trust-signals", status: null, suggestion: { status: "working_well", note: "Testimonials/reviews wording found — check they are real and current" }, evidence: testimonialPage.testimonialSignals.join(", "), evidenceUrl: testimonialPage.url });
  else pf.push({ itemId: "bp-trust-signals", status: null, suggestion: { status: "needs_improvement", note: `No testimonial or review wording on the ${pagesLabel}` }, evidence: "" });
  if (result.ctas.length === 0) pf.push({ itemId: "wc-cta", status: null, suggestion: { status: "needs_improvement", note: "No clear call-to-action wording found" }, evidence: "" });
  if (homeFacts.h1[0]) pf.push({ itemId: "bp-value-prop", status: null, suggestion: null, evidence: `H1: “${homeFacts.h1[0]}”`, evidenceUrl: home });

  // ---- Industry suggestions (keyword matches = inference)
  const haystack = [homeFacts.title, homeFacts.metaDescription, ...homeFacts.h1, ...homeFacts.h2, ...facts.map((f) => f.textSample)].join(" ").toLowerCase();
  result.industrySuggestions = suggestIndustries(haystack, industries);
  for (const s of result.industrySuggestions) obs.push({ kind: "inference", area: "Industry", text: `Possibly ${s.name} (website mentions: ${s.matched.join(", ")})` });

  // Social profiles linked from the site but not supplied by the consultant.
  for (const m of result.manualChecks) if (!m.url && result.socialFound[m.platform.toLowerCase()]?.[0]) m.url = result.socialFound[m.platform.toLowerCase()][0];
}

function manualSocialChecks(input: DiscoveryInput) {
  const note = "Not fetched automatically — this platform restricts automated access. Open the profile and assess posting frequency, engagement and content quality.";
  const out: DiscoveryResult["manualChecks"] = [
    { platform: "Instagram", url: input.instagram?.trim() || null, note },
    { platform: "LinkedIn", url: input.linkedin?.trim() || null, note },
    { platform: "YouTube", url: input.youtube?.trim() || null, note },
  ];
  for (const l of input.otherLinks ?? []) if (l.trim()) out.push({ platform: "Other", url: l.trim(), note: "Not fetched automatically. Review manually." });
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cap = (s: string) => (s === "x" ? "X" : s[0].toUpperCase() + s.slice(1));

/** Keyword match of free text (site copy, an Instagram bio) against industry keywords. Inference only. */
export function suggestIndustries(text: string, industries: IndustryKw[]) {
  const haystack = text.toLowerCase();
  return industries
    .map((ind) => ({ industryId: ind.id, name: ind.name, matched: ind.keywords.filter((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(haystack)) }))
    .filter((s) => s.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length)
    .slice(0, 3);
}
