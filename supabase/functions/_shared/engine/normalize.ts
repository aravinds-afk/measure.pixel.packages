// Text normalisation and fuzzy set matching for free-text member data.

const STOPWORDS = new Set([
  "a", "an", "and", "the", "of", "for", "to", "in", "on", "with", "by", "at", "or", "from", "who", "that",
  "their", "our", "your", "my", "we", "they", "need", "needs", "looking", "help", "helps", "services",
  "service", "solutions", "solution", "business", "businesses", "company", "companies", "clients",
  "client", "customers", "customer", "based", "etc", "all", "any", "new", "who", "are", "is", "be",
]);

/** Canonical vocabulary. Keys are canonical terms, values are synonyms (already lowercase). */
const SYNONYMS: Record<string, string[]> = {
  "small and medium businesses": [
    "sme", "smes", "smb", "smbs", "msme", "msmes", "small business", "small businesses", "small & medium businesses",
    "small and medium enterprises", "small and mid-sized businesses", "small business owners", "business owners",
    "owner-managed businesses", "growing businesses", "mid-sized businesses", "family businesses",
  ],
  startups: ["startup", "start-ups", "start-up", "founders", "early-stage companies", "early stage startups", "funded startups"],
  enterprises: ["enterprise", "large companies", "corporates", "corporate", "mnc", "mncs", "large enterprises", "corporate clients"],
  homeowners: ["homeowner", "home owners", "residential clients", "residential customers", "households", "families"],
  "home buyers": ["home buyer", "first-time buyers", "first time home buyers", "property buyers", "house hunters"],
  "property owners": ["landlords", "landlord", "property investors", "real estate investors", "building owners"],
  professionals: ["salaried professionals", "working professionals", "executives", "high-income professionals", "doctors and professionals"],
  "high net worth individuals": ["hni", "hnis", "high net worth", "wealthy families", "affluent individuals"],
  manufacturers: ["manufacturer", "manufacturing companies", "factories", "factory owners", "industrial companies", "msme manufacturers"],
  retailers: ["retailer", "retail stores", "shops", "store owners", "showrooms"],
  restaurants: ["restaurant", "cafes", "cafe", "hotels", "hospitality businesses", "food businesses"],
  "healthcare providers": ["clinics", "clinic", "hospitals", "doctors", "dentists", "healthcare clinics", "medical practices"],
  schools: ["school", "colleges", "educational institutions", "education institutes", "coaching centres"],
  "ecommerce brands": ["ecommerce", "e-commerce", "d2c brands", "d2c", "online stores", "online sellers"],
  "professional services firms": ["consultants", "consulting firms", "agencies", "law firms", "ca firms", "accounting firms"],
  "real estate developers": ["developers", "builders", "property developers"],
  "event organisers": ["event organizers", "event planners", "wedding planners"],
  nonprofits: ["ngo", "ngos", "non-profits", "charities", "trusts"],
  // industries
  technology: ["it", "software", "saas", "tech", "information technology", "tech companies"],
  healthcare: ["medical", "health", "pharma", "pharmaceuticals", "healthcare and wellness"],
  "real estate": ["property", "realty", "real-estate"],
  manufacturing: ["industrial", "engineering", "production"],
  retail: ["consumer goods", "fmcg", "retail and ecommerce"],
  hospitality: ["food and beverage", "f&b", "hotels and restaurants", "travel and hospitality"],
  education: ["edtech", "training and education"],
  "professional services": ["consulting", "legal", "accounting"],
  construction: ["infrastructure", "contracting", "civil construction"],
  "financial services": ["finance", "banking", "fintech", "insurance"],
  logistics: ["transport", "transportation", "supply chain", "warehousing"],
  // company sizes
  "micro (1-10)": ["1-10", "1-10 employees", "micro", "micro businesses", "under 10 employees", "solopreneurs", "solo"],
  "small (11-50)": ["11-50", "10-50", "11-50 employees", "10-50 employees", "small"],
  "medium (51-250)": ["51-250", "50-250", "51-200", "50-200", "medium", "mid-size", "mid-market"],
  "large (250+)": ["250+", "200+", "500+", "large", "1000+"],
  individuals: ["individual", "consumers", "consumer", "b2c", "retail customers", "people"],
};

const WILDCARD_AREAS = ["online", "remote", "pan india", "pan-india", "nationwide", "national", "global", "worldwide", "anywhere", "all india", "international"];
const WILDCARD_INDUSTRIES = ["all industries", "any industry", "industry agnostic", "all sectors", "any"];

const synonymIndex: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [canon, syns] of Object.entries(SYNONYMS)) {
    m.set(canon, canon);
    for (const s of syns) m.set(s, canon);
  }
  return m;
})();

export function clean(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9+&\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map a phrase to its canonical vocabulary term when known; otherwise return the cleaned phrase. */
export function canonical(s: string): string {
  const c = clean(s);
  if (synonymIndex.has(c)) return synonymIndex.get(c)!;
  const singular = c.replace(/s$/, "");
  if (synonymIndex.has(singular)) return synonymIndex.get(singular)!;
  return c;
}

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokens(s: string): string[] {
  return clean(s)
    .split(/[\s\-]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

export function tokenSet(items: string[]): Set<string> {
  const out = new Set<string>();
  for (const i of items) for (const t of tokens(i)) out.add(t);
  return out;
}

/** Split a delimited list cell from CSV/Excel or a form field. */
export function splitList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.flatMap(splitList);
  return String(v)
    .split(/[;|\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function phraseSimilarity(a: string, b: string): number {
  const ca = canonical(a);
  const cb = canonical(b);
  if (ca === cb) return 1;
  const ta = new Set(tokens(ca));
  const tb = new Set(tokens(cb));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size) >= 0.6 && inter / Math.max(ta.size, tb.size) >= 0.34 ? 0.8 : 0;
}

export interface SetMatch {
  /** Items (from list A, display form) that have a counterpart in B. */
  shared: string[];
  /** Overlap coefficient |A∩B| / min(|A|,|B|), 0–1. */
  overlap: number;
  /** Jaccard similarity, 0–1. */
  jaccard: number;
}

/** Fuzzy set intersection over phrases, using the canonical vocabulary and token overlap. */
export function matchSets(a: string[], b: string[]): SetMatch {
  const A = dedupe(a);
  const B = dedupe(b);
  if (!A.length || !B.length) return { shared: [], overlap: 0, jaccard: 0 };
  const shared: string[] = [];
  let total = 0;
  const usedB = new Set<number>();
  for (const x of A) {
    let best = 0;
    let bestIdx = -1;
    B.forEach((y, idx) => {
      if (usedB.has(idx)) return;
      const s = phraseSimilarity(x, y);
      if (s > best) {
        best = s;
        bestIdx = idx;
      }
    });
    if (best > 0) {
      usedB.add(bestIdx);
      total += best;
      shared.push(x);
    }
  }
  const overlap = total / Math.min(A.length, B.length);
  const jaccard = total / (A.length + B.length - total);
  return { shared, overlap: Math.min(1, overlap), jaccard: Math.min(1, jaccard) };
}

export function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    const t = i.trim();
    if (!t) continue;
    const k = canonical(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Token-level similarity of two bodies of text (0–1, overlap coefficient). */
export function textOverlap(a: string[], b: string[]): { value: number; shared: string[] } {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (!ta.size || !tb.size) return { value: 0, shared: [] };
  const shared = [...ta].filter((t) => tb.has(t));
  return { value: shared.length / Math.min(ta.size, tb.size), shared };
}

export function isWildcardArea(s: string): boolean {
  const c = clean(s);
  return WILDCARD_AREAS.some((w) => c === w || c.includes(w));
}

export function isWildcardIndustry(s: string): boolean {
  const c = clean(s);
  return WILDCARD_INDUSTRIES.some((w) => c === w);
}

export function slug(s: string): string {
  return clean(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Human list: "a, b and c". */
export function humanList(items: string[], max = 4): string {
  const list = items.slice(0, max);
  const extra = items.length - list.length;
  if (extra > 0) list.push(`${extra} more`);
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}
