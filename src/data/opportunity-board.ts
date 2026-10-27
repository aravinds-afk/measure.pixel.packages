/**
 * Source-derived data from "Measure Pixel - Opportunity Board.pdf" (docs/).
 *
 * Everything in this file is transcribed from the board. It is the read-only
 * "source" layer: the database is seeded from it, admins edit the database
 * copy, and each record keeps this original as `sourceSnapshot` so overrides
 * stay distinguishable from the board.
 *
 * Where the board is silent (individual service prices, deliverables) the
 * value is null and the UI flags it for configuration. Where a mapping had to
 * be interpreted (offer component label -> catalogue service) the mapping is
 * tagged `basis: "inferred"` so it can be reviewed in Settings.
 *
 * Money is in whole rupees here; the app stores paise.
 */

export const BOARD_SOURCE = {
  title: "Measure Pixel Opportunity Board",
  file: "docs/Measure Pixel - Opportunity Board.pdf",
  pages: 5,
  priceBandNote: "Price bands are planning figures, set per client after discovery.",
} as const;

// ---------------------------------------------------------------- Page 1 ---

export const REVENUE_TARGET = {
  targetMonthly: 300000,
  targetDate: "2027-01-23",
  windowStart: "2026-10-25",
  windowNote: "Recurring, not project revenue. Ninety days from 25 October 2026.",
  startingSigned: 25000,
  startingGap: 275000,
  sellableCombinations: 1408,
  closeRateNote:
    "One retainer in. At a 1-in-5 close rate the shortest route needs about 30 real conversations — three a week.",
  profitFloorMonthly: 30000,
} as const;

export const REVENUE_ROUTES = [
  { id: "route-12x25", clients: 12, monthlyEach: 25000, label: "at ₹25K each", description: "Local packs and measurement retainers. Fastest to close, most to manage." },
  { id: "route-10x30", clients: 10, monthlyEach: 30000, label: "at ₹30K each", description: "The stated profit floor. Ten clients is a real delivery load." },
  { id: "route-6x50", clients: 6, monthlyEach: 50000, label: "at ₹50K each", description: "Clinics, interiors, study abroad. The realistic middle." },
  { id: "route-4x75", clients: 4, monthlyEach: 75000, label: "at ₹75K each", description: "Developers, hospital groups, school groups. Slow to close." },
  { id: "route-5x60", clients: 5, monthlyEach: 60000, label: "at ₹60K average", description: "Two anchors plus three cash-tier clients. The likely shape." },
] as const;

export const CASH_TIER = {
  heading: "Work these first — the cash tier",
  description:
    "Small scope, one decision maker, closes inside a month, clears the ₹30K profit floor. Real estate and hospital groups are the anchor tier — pursue them while these pay the bills.",
  segments: ["Dental & skin clinics", "CA & CFO firms", "Study abroad", "Coaching institutes", "Solar installers", "Home services", "Anyone already running ads"],
} as const;

// ---------------------------------------------------------------- Page 2 ---

export type ServiceLinkId = "be-found" | "be-chosen" | "capture-it" | "follow-up-retain" | "measure";

export const SERVICE_LINKS: { id: ServiceLinkId; name: string; order: number; note?: string }[] = [
  { id: "be-found", name: "Be found", order: 1 },
  { id: "be-chosen", name: "Be chosen", order: 2 },
  { id: "capture-it", name: "Capture it", order: 3 },
  { id: "follow-up-retain", name: "Follow up & retain", order: 4 },
  {
    id: "measure",
    name: "Measure",
    order: 5,
    note: "Sells on its own at ₹15–25K/month and opens every other column. Measurement runs under all four of the others — the cheapest door into any account.",
  },
];

export const SERVICES: { id: string; name: string; linkId: ServiceLinkId }[] = [
  // Be found (9)
  { id: "google-ads", name: "Google Ads", linkId: "be-found" },
  { id: "meta-ads", name: "Meta Ads", linkId: "be-found" },
  { id: "seo-local-search", name: "SEO & local search", linkId: "be-found" },
  { id: "google-business-profile", name: "Google Business Profile", linkId: "be-found" },
  { id: "reputation-reviews", name: "Reputation & reviews", linkId: "be-found" },
  { id: "social-media-management", name: "Social media management", linkId: "be-found" },
  { id: "influencer-ugc", name: "Influencer & UGC", linkId: "be-found" },
  { id: "linkedin-b2b-outbound", name: "LinkedIn & B2B outbound", linkId: "be-found" },
  { id: "youtube-channel-management", name: "YouTube channel management", linkId: "be-found" },
  // Be chosen (7)
  { id: "video-production", name: "Video production", linkId: "be-chosen" },
  { id: "photography", name: "Photography", linkId: "be-chosen" },
  { id: "drone-aerial", name: "Drone & aerial", linkId: "be-chosen" },
  { id: "branding-design", name: "Branding & design", linkId: "be-chosen" },
  { id: "website-development", name: "Website development", linkId: "be-chosen" },
  { id: "landing-pages-funnels", name: "Landing pages & funnels", linkId: "be-chosen" },
  { id: "content-copywriting", name: "Content & copywriting", linkId: "be-chosen" },
  // Capture it (4)
  { id: "lead-forms", name: "Lead forms", linkId: "capture-it" },
  { id: "whatsapp-intake", name: "WhatsApp intake", linkId: "capture-it" },
  { id: "crm-setup", name: "CRM setup", linkId: "capture-it" },
  { id: "call-tracking", name: "Call tracking", linkId: "capture-it" },
  // Follow up & retain (7)
  { id: "crm-sales-automation", name: "CRM & sales automation", linkId: "follow-up-retain" },
  { id: "whatsapp-automation", name: "WhatsApp automation", linkId: "follow-up-retain" },
  { id: "email-sms-automation", name: "Email & SMS automation", linkId: "follow-up-retain" },
  { id: "ai-business-automation", name: "AI business automation", linkId: "follow-up-retain" },
  { id: "lms-online-learning", name: "LMS & online learning", linkId: "follow-up-retain" },
  { id: "hosting-care-plans", name: "Hosting & care plans", linkId: "follow-up-retain" },
  { id: "corporate-training", name: "Corporate training", linkId: "follow-up-retain" },
  // Measure (5)
  { id: "ga4-gtm", name: "GA4 & GTM", linkId: "measure" },
  { id: "conversion-tracking-capi", name: "Conversion tracking & CAPI", linkId: "measure" },
  { id: "dashboards-reporting", name: "Dashboards & reporting", linkId: "measure" },
  { id: "cro-ab-testing", name: "CRO & A/B testing", linkId: "measure" },
  { id: "strategy-consulting", name: "Strategy & consulting", linkId: "measure" },
];

// ---------------------------------------------------------------- Page 3 ---

export type ClusterId = "healthcare" | "education" | "property-build" | "money-b2b" | "consumer-local";

export const INDUSTRY_CLUSTERS: { id: ClusterId; name: string; order: number }[] = [
  { id: "healthcare", name: "Healthcare", order: 1 },
  { id: "education", name: "Education", order: 2 },
  { id: "property-build", name: "Property & build", order: 3 },
  { id: "money-b2b", name: "Money & B2B", order: 4 },
  { id: "consumer-local", name: "Consumer & local", order: 5 },
];

export const INDUSTRIES: { id: string; name: string; clusterId: ClusterId }[] = [
  // Healthcare (9)
  { id: "hospitals", name: "Hospitals", clusterId: "healthcare" },
  { id: "single-specialty-clinics", name: "Single-specialty clinics", clusterId: "healthcare" },
  { id: "dental-clinics", name: "Dental clinics", clusterId: "healthcare" },
  { id: "skin-hair-clinics", name: "Skin & hair clinics", clusterId: "healthcare" },
  { id: "fertility-ivf-centres", name: "Fertility & IVF centres", clusterId: "healthcare" },
  { id: "diagnostic-labs", name: "Diagnostic labs", clusterId: "healthcare" },
  { id: "physiotherapy-rehab", name: "Physiotherapy & rehab", clusterId: "healthcare" },
  { id: "senior-care-home-nursing", name: "Senior care & home nursing", clusterId: "healthcare" },
  { id: "veterinary-pet-care", name: "Veterinary & pet care", clusterId: "healthcare" },
  // Education (8)
  { id: "schools", name: "Schools", clusterId: "education" },
  { id: "colleges", name: "Colleges", clusterId: "education" },
  { id: "coaching-institutes", name: "Coaching institutes", clusterId: "education" },
  { id: "study-abroad-consultants", name: "Study abroad consultants", clusterId: "education" },
  { id: "preschools-daycare", name: "Preschools & daycare", clusterId: "education" },
  { id: "test-prep-centres", name: "Test prep centres", clusterId: "education" },
  { id: "arts-music-academies", name: "Arts & music academies", clusterId: "education" },
  { id: "corporate-training-firms", name: "Corporate training firms", clusterId: "education" },
  // Property & build (8)
  { id: "real-estate-developers", name: "Real estate developers", clusterId: "property-build" },
  { id: "construction-firms", name: "Construction firms", clusterId: "property-build" },
  { id: "interior-designers", name: "Interior designers", clusterId: "property-build" },
  { id: "architects", name: "Architects", clusterId: "property-build" },
  { id: "modular-kitchen-furniture", name: "Modular kitchen & furniture", clusterId: "property-build" },
  { id: "resale-brokers", name: "Resale brokers", clusterId: "property-build" },
  { id: "commercial-contractors", name: "Commercial contractors", clusterId: "property-build" },
  { id: "co-working-spaces", name: "Co-working spaces", clusterId: "property-build" },
  // Money & B2B (8)
  { id: "ca-cfo-firms", name: "CA & CFO firms", clusterId: "money-b2b" },
  { id: "legal-firms", name: "Legal firms", clusterId: "money-b2b" },
  { id: "business-consultants", name: "Business consultants", clusterId: "money-b2b" },
  { id: "recruitment-agencies", name: "Recruitment agencies", clusterId: "money-b2b" },
  { id: "insurance-advisors", name: "Insurance advisors", clusterId: "money-b2b" },
  { id: "loan-consultants-dsas", name: "Loan consultants & DSAs", clusterId: "money-b2b" },
  { id: "printing-packaging", name: "Printing & packaging", clusterId: "money-b2b" },
  { id: "manufacturing-industrial", name: "Manufacturing & industrial", clusterId: "money-b2b" },
  // Consumer & local (11)
  { id: "restaurants-cloud-kitchens", name: "Restaurants & cloud kitchens", clusterId: "consumer-local" },
  { id: "hotels-resorts", name: "Hotels & resorts", clusterId: "consumer-local" },
  { id: "travel-operators", name: "Travel operators", clusterId: "consumer-local" },
  { id: "gyms-fitness-studios", name: "Gyms & fitness studios", clusterId: "consumer-local" },
  { id: "salons-spas", name: "Salons & spas", clusterId: "consumer-local" },
  { id: "jewellery-brands", name: "Jewellery brands", clusterId: "consumer-local" },
  { id: "textile-saree-brands", name: "Textile & saree brands", clusterId: "consumer-local" },
  { id: "automobile-dealers", name: "Automobile dealers", clusterId: "consumer-local" },
  { id: "home-services", name: "Home services", clusterId: "consumer-local" },
  { id: "solar-installers", name: "Solar installers", clusterId: "consumer-local" },
  { id: "wedding-event-services", name: "Wedding & event services", clusterId: "consumer-local" },
];

// ------------------------------------------------------------ Pages 4–5 ---

export type PriceBand = { min: number; max: number } | null;

export type OfferComponent = {
  /** Label exactly as printed on the board. */
  label: string;
  /** Catalogue services this label refers to. */
  serviceIds: string[];
  /** exact: label equals a service name. inferred: interpreted, review in Settings. unmapped: no clear service. */
  basis: "exact" | "inferred" | "unmapped";
};

export type SourceOffer = {
  id: string;
  number: number;
  name: string;
  /** Cluster as printed on the card; null = any industry. */
  clusterId: ClusterId | null;
  audienceLabel: string;
  buyerQuote: string;
  components: OfferComponent[];
  /** "setup" = one-time setup fee, "project" = one-time project fee. */
  upfrontKind: "setup" | "project";
  upfront: PriceBand;
  /** True when the board prints "Included" instead of a setup price. */
  upfrontIncluded?: boolean;
  monthly: PriceBand;
  /** Fixed term printed on the card, e.g. "MONTHLY × 6". */
  monthlyTermMonths?: number;
  /**
   * Industries the offer name points to, within its cluster. Not printed on the
   * board as a list — derived from the offer name, used only to rank, editable.
   */
  suggestedIndustryIds: string[];
  pageNote?: string;
};

const c = (label: string, serviceIds: string[], basis: OfferComponent["basis"]): OfferComponent => ({ label, serviceIds, basis });

export const OFFERS: SourceOffer[] = [
  {
    id: "clinic-patient-engine", number: 1, name: "Clinic Patient Engine", clusterId: "healthcare", audienceLabel: "Healthcare",
    buyerQuote: "We get patients only by reference, and the new doctor has empty slots.",
    components: [c("Google Ads", ["google-ads"], "exact"), c("Landing page", ["landing-pages-funnels"], "inferred"), c("WhatsApp intake", ["whatsapp-intake"], "exact"), c("Conversion tracking", ["conversion-tracking-capi"], "inferred")],
    upfrontKind: "setup", upfront: { min: 40000, max: 60000 }, monthly: { min: 35000, max: 50000 },
    suggestedIndustryIds: ["single-specialty-clinics", "dental-clinics", "skin-hair-clinics", "fertility-ivf-centres", "physiotherapy-rehab"],
  },
  {
    id: "specialty-launch-film", number: 2, name: "Specialty Launch Film", clusterId: "healthcare", audienceLabel: "Healthcare",
    buyerQuote: "We opened a new department and nobody knows it exists.",
    components: [c("Video production", ["video-production"], "exact"), c("Photography", ["photography"], "exact"), c("Social media", ["social-media-management"], "inferred"), c("Paid amplification", ["meta-ads", "google-ads"], "inferred")],
    upfrontKind: "project", upfront: { min: 150000, max: 300000 }, monthly: { min: 20000, max: 30000 },
    suggestedIndustryIds: ["hospitals", "single-specialty-clinics"],
  },
  {
    id: "study-abroad-intake-system", number: 3, name: "Study Abroad Intake System", clusterId: "education", audienceLabel: "Education",
    buyerQuote: "Enquiries come in, but the students end up going with someone else.",
    components: [c("Meta Ads", ["meta-ads"], "exact"), c("Google Ads", ["google-ads"], "exact"), c("CRM", ["crm-setup"], "inferred"), c("WhatsApp automation", ["whatsapp-automation"], "exact")],
    upfrontKind: "setup", upfront: { min: 50000, max: 50000 }, monthly: { min: 40000, max: 60000 },
    suggestedIndustryIds: ["study-abroad-consultants"],
  },
  {
    id: "admissions-season-engine", number: 4, name: "Admissions Season Engine", clusterId: "education", audienceLabel: "Education",
    buyerQuote: "Admissions were down this year and we don’t know why.",
    components: [c("Video production", ["video-production"], "exact"), c("Meta Ads", ["meta-ads"], "exact"), c("WhatsApp automation", ["whatsapp-automation"], "exact"), c("CRM", ["crm-setup"], "inferred")],
    upfrontKind: "setup", upfront: null, upfrontIncluded: true, monthly: { min: 50000, max: 75000 }, monthlyTermMonths: 6,
    suggestedIndustryIds: ["schools", "colleges", "preschools-daycare"],
  },
  {
    id: "coaching-funnel-lms", number: 5, name: "Coaching Funnel & LMS", clusterId: "education", audienceLabel: "Education",
    buyerQuote: "We want to sell our course online but we don’t know where to start.",
    components: [c("Landing page & funnel", ["landing-pages-funnels"], "inferred"), c("Meta Ads", ["meta-ads"], "exact"), c("LMS build", ["lms-online-learning"], "inferred"), c("Email & SMS", ["email-sms-automation"], "inferred")],
    upfrontKind: "setup", upfront: { min: 75000, max: 75000 }, monthly: { min: 35000, max: 50000 },
    suggestedIndustryIds: ["coaching-institutes", "test-prep-centres", "arts-music-academies", "corporate-training-firms"],
  },
  {
    id: "project-launch-package", number: 6, name: "Project Launch Package", clusterId: "property-build", audienceLabel: "Property & build",
    buyerQuote: "We’re launching a new project next quarter.",
    components: [c("Drone & aerial", ["drone-aerial"], "exact"), c("Video", ["video-production"], "inferred"), c("Landing page", ["landing-pages-funnels"], "inferred"), c("Meta & Google Ads", ["meta-ads", "google-ads"], "inferred"), c("CRM", ["crm-setup"], "inferred")],
    upfrontKind: "project", upfront: { min: 200000, max: 400000 }, monthly: { min: 50000, max: 75000 },
    suggestedIndustryIds: ["real-estate-developers", "construction-firms", "commercial-contractors"],
  },
  {
    id: "interior-enquiry-system", number: 7, name: "Interior Enquiry System", clusterId: "property-build", audienceLabel: "Property & build",
    buyerQuote: "The leads we get are all price shoppers who never convert.",
    components: [c("Video funnel", ["video-production", "landing-pages-funnels"], "inferred"), c("Meta Ads", ["meta-ads"], "exact"), c("Lead qualification", [], "unmapped"), c("CRM follow-up", ["crm-sales-automation"], "inferred")],
    upfrontKind: "setup", upfront: { min: 60000, max: 60000 }, monthly: { min: 50000, max: 75000 },
    suggestedIndustryIds: ["interior-designers", "modular-kitchen-furniture", "architects"],
  },
  {
    id: "professional-services-enquiry-desk", number: 8, name: "Professional Services Enquiry Desk", clusterId: "money-b2b", audienceLabel: "Money & B2B",
    buyerQuote: "All our business comes from word of mouth.",
    components: [c("Google Ads exact match", ["google-ads"], "inferred"), c("Landing page", ["landing-pages-funnels"], "inferred"), c("Call tracking", ["call-tracking"], "exact"), c("Dashboard", ["dashboards-reporting"], "inferred")],
    upfrontKind: "setup", upfront: { min: 25000, max: 25000 }, monthly: { min: 25000, max: 35000 },
    suggestedIndustryIds: ["ca-cfo-firms", "legal-firms", "business-consultants", "insurance-advisors", "loan-consultants-dsas"],
  },
  {
    id: "b2b-pipeline-build", number: 9, name: "B2B Pipeline Build", clusterId: "money-b2b", audienceLabel: "Money & B2B",
    buyerQuote: "Our website gets traffic but no enquiries.",
    components: [c("Website", ["website-development"], "inferred"), c("Google Ads", ["google-ads"], "exact"), c("LinkedIn outbound", ["linkedin-b2b-outbound"], "inferred"), c("CRM", ["crm-setup"], "inferred")],
    upfrontKind: "setup", upfront: { min: 100000, max: 100000 }, monthly: { min: 40000, max: 60000 },
    suggestedIndustryIds: ["recruitment-agencies", "printing-packaging", "manufacturing-industrial", "business-consultants"],
  },
  {
    id: "local-domination-pack", number: 10, name: "Local Domination Pack", clusterId: "consumer-local", audienceLabel: "Consumer & local",
    buyerQuote: "We’re not showing up on Google Maps.",
    components: [c("Google Business Profile", ["google-business-profile"], "exact"), c("Reviews", ["reputation-reviews"], "inferred"), c("Local Google Ads", ["google-ads"], "inferred"), c("Call tracking", ["call-tracking"], "exact")],
    upfrontKind: "setup", upfront: { min: 15000, max: 15000 }, monthly: { min: 18000, max: 28000 },
    suggestedIndustryIds: ["restaurants-cloud-kitchens", "gyms-fitness-studios", "salons-spas", "home-services", "automobile-dealers"],
  },
  {
    id: "solar-home-services-lead-engine", number: 11, name: "Solar & Home Services Lead Engine", clusterId: "consumer-local", audienceLabel: "Consumer & local",
    buyerQuote: "We buy leads from a portal and most of them are junk.",
    components: [c("Google Ads", ["google-ads"], "exact"), c("Google Business Profile", ["google-business-profile"], "exact"), c("Landing page", ["landing-pages-funnels"], "inferred"), c("Call tracking", ["call-tracking"], "exact")],
    upfrontKind: "setup", upfront: { min: 25000, max: 25000 }, monthly: { min: 25000, max: 40000 },
    suggestedIndustryIds: ["solar-installers", "home-services"],
  },
  {
    id: "hospitality-visibility-pack", number: 12, name: "Hospitality Visibility Pack", clusterId: "consumer-local", audienceLabel: "Consumer & local",
    buyerQuote: "Weekends are full, weekdays are empty.",
    components: [c("Photography", ["photography"], "exact"), c("Social media", ["social-media-management"], "inferred"), c("Influencer & UGC", ["influencer-ugc"], "exact"), c("Google Business Profile", ["google-business-profile"], "exact")],
    upfrontKind: "setup", upfront: { min: 40000, max: 40000 }, monthly: { min: 30000, max: 45000 },
    suggestedIndustryIds: ["hotels-resorts", "restaurants-cloud-kitchens", "travel-operators"],
  },
  {
    id: "measurement-retainer", number: 13, name: "Measurement Retainer", clusterId: null, audienceLabel: "Any industry — the wedge",
    buyerQuote: "We spend on ads but we honestly don’t know what’s working.",
    components: [c("GA4 & GTM", ["ga4-gtm"], "exact"), c("Conversion tracking & CAPI", ["conversion-tracking-capi"], "exact"), c("Dashboards", ["dashboards-reporting"], "inferred"), c("Monthly review", ["strategy-consulting"], "inferred")],
    upfrontKind: "setup", upfront: { min: 30000, max: 30000 }, monthly: { min: 15000, max: 25000 },
    suggestedIndustryIds: [],
    pageNote: "Measurement is the cheapest way into an account that already spends.",
  },
  {
    id: "ai-follow-up-layer", number: 14, name: "AI Follow-up Layer", clusterId: null, audienceLabel: "Any industry — upsell",
    buyerQuote: "We get enough enquiries. The team just doesn’t follow up.",
    components: [c("AI business automation", ["ai-business-automation"], "exact"), c("WhatsApp automation", ["whatsapp-automation"], "exact"), c("CRM", ["crm-setup"], "inferred"), c("Email & SMS", ["email-sms-automation"], "inferred")],
    upfrontKind: "setup", upfront: { min: 60000, max: 60000 }, monthly: { min: 25000, max: 40000 },
    suggestedIndustryIds: [],
    pageNote: "The AI follow-up layer is the cleanest upsell on a client we already hold.",
  },
];
