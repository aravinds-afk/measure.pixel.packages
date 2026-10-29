/**
 * Measure Pixel default configuration that is NOT printed on the Opportunity
 * Board: the audit checklist, recommendation rules, service dependencies,
 * example calculator prices supplied in the build brief, tax and quotation
 * terms. All of it is seeded into the database and editable in Settings.
 *
 * Money is in whole rupees here; the app stores paise.
 */

export type Priority = "high" | "medium" | "low";

export const AUDIT_CATEGORIES = [
  { id: "brand-positioning", name: "Brand & Positioning" },
  { id: "website-conversion", name: "Website & Conversion" },
  { id: "content-creative", name: "Content & Creative" },
  { id: "paid-advertising", name: "Paid Advertising" },
  { id: "seo-visibility", name: "SEO & Online Visibility" },
  { id: "lead-capture", name: "Lead Capture" },
  { id: "sales-crm", name: "Sales & CRM" },
  { id: "whatsapp-automation", name: "WhatsApp & Business Automation" },
  { id: "analytics", name: "Analytics & Measurement" },
  { id: "growth-strategy", name: "Growth Strategy" },
] as const;

/**
 * autoCheck names a website-discovery signal that can prefill the item. The
 * discovery module decides whether the evidence is strong enough to set a
 * status (verified) or only to suggest one (inferred).
 */
export type AuditItemSeed = {
  id: string;
  categoryId: (typeof AUDIT_CATEGORIES)[number]["id"];
  label: string;
  help?: string;
  priority: Priority;
  serviceIds: string[];
  autoCheck?: string;
};

export const AUDIT_ITEMS: AuditItemSeed[] = [
  // Brand & Positioning
  { id: "bp-value-prop", categoryId: "brand-positioning", label: "Clear value proposition on the homepage", help: "A visitor understands what the business does, for whom, and why it is better within five seconds.", priority: "high", serviceIds: ["content-copywriting", "branding-design"], autoCheck: "headline" },
  { id: "bp-visual-identity", categoryId: "brand-positioning", label: "Consistent logo, colours and visual identity", priority: "medium", serviceIds: ["branding-design"] },
  { id: "bp-differentiation", categoryId: "brand-positioning", label: "Clear differentiation from competitors", priority: "medium", serviceIds: ["strategy-consulting", "content-copywriting"] },
  { id: "bp-trust-signals", categoryId: "brand-positioning", label: "Trust signals visible (testimonials, credentials, case studies)", priority: "high", serviceIds: ["reputation-reviews", "content-copywriting", "video-production"], autoCheck: "testimonials" },
  // Website & Conversion
  { id: "wc-mobile", categoryId: "website-conversion", label: "Website works well on mobile", priority: "high", serviceIds: ["website-development"], autoCheck: "viewport" },
  { id: "wc-https", categoryId: "website-conversion", label: "Website served securely over HTTPS", priority: "medium", serviceIds: ["website-development", "hosting-care-plans"], autoCheck: "https" },
  { id: "wc-cta", categoryId: "website-conversion", label: "Clear primary call to action on key pages", priority: "high", serviceIds: ["landing-pages-funnels", "cro-ab-testing"], autoCheck: "cta" },
  { id: "wc-landing-pages", categoryId: "website-conversion", label: "Dedicated landing pages for campaigns or key services", priority: "high", serviceIds: ["landing-pages-funnels"] },
  { id: "wc-conversion-rate", categoryId: "website-conversion", label: "Website traffic turns into enquiries", help: "Confirm with the client — never infer conversion rates from a public page.", priority: "high", serviceIds: ["cro-ab-testing", "landing-pages-funnels"] },
  { id: "wc-speed", categoryId: "website-conversion", label: "Pages load quickly on mobile", priority: "medium", serviceIds: ["website-development", "hosting-care-plans"] },
  { id: "wc-maintenance", categoryId: "website-conversion", label: "Website maintained, backed up and updated", priority: "low", serviceIds: ["hosting-care-plans"] },
  // Content & Creative
  { id: "cc-video", categoryId: "content-creative", label: "Video content for the business and its services", priority: "medium", serviceIds: ["video-production"], autoCheck: "video" },
  { id: "cc-photography", categoryId: "content-creative", label: "Professional photography of premises, team or work", priority: "medium", serviceIds: ["photography"] },
  { id: "cc-social-active", categoryId: "content-creative", label: "Active, consistent social media presence", priority: "medium", serviceIds: ["social-media-management"] },
  { id: "cc-copy", categoryId: "content-creative", label: "Clear service descriptions and copy", priority: "medium", serviceIds: ["content-copywriting"] },
  { id: "cc-youtube", categoryId: "content-creative", label: "YouTube channel maintained", priority: "low", serviceIds: ["youtube-channel-management"] },
  { id: "cc-aerial", categoryId: "content-creative", label: "Aerial / site footage where the product is a place", priority: "low", serviceIds: ["drone-aerial"] },
  // Paid Advertising
  { id: "pa-google-ads", categoryId: "paid-advertising", label: "Google Ads running for high-intent searches", priority: "high", serviceIds: ["google-ads"], autoCheck: "google-ads-tag" },
  { id: "pa-meta-ads", categoryId: "paid-advertising", label: "Meta (Facebook / Instagram) ads running", priority: "high", serviceIds: ["meta-ads"], autoCheck: "meta-pixel" },
  { id: "pa-ad-landing", categoryId: "paid-advertising", label: "Ads send traffic to relevant landing pages, not the homepage", priority: "medium", serviceIds: ["landing-pages-funnels"] },
  { id: "pa-creative", categoryId: "paid-advertising", label: "Ad creatives refreshed regularly", priority: "medium", serviceIds: ["video-production", "content-copywriting"] },
  { id: "pa-linkedin", categoryId: "paid-advertising", label: "LinkedIn advertising or outbound for B2B buyers", priority: "low", serviceIds: ["linkedin-b2b-outbound"], autoCheck: "linkedin-insight" },
  // SEO & Online Visibility
  { id: "seo-gbp", categoryId: "seo-visibility", label: "Google Business Profile claimed and optimised", priority: "high", serviceIds: ["google-business-profile"] },
  { id: "seo-reviews", categoryId: "seo-visibility", label: "Steady flow of Google reviews, with responses", priority: "high", serviceIds: ["reputation-reviews"] },
  { id: "seo-ranking", categoryId: "seo-visibility", label: "Ranks for core service + location searches", priority: "high", serviceIds: ["seo-local-search"] },
  { id: "seo-onpage", categoryId: "seo-visibility", label: "Page titles and meta descriptions set", priority: "medium", serviceIds: ["seo-local-search"], autoCheck: "meta-tags" },
  { id: "seo-schema", categoryId: "seo-visibility", label: "Local business structured data", priority: "low", serviceIds: ["seo-local-search"], autoCheck: "schema" },
  { id: "seo-influencer", categoryId: "seo-visibility", label: "Creator, influencer or customer-generated content", priority: "low", serviceIds: ["influencer-ugc"] },
  // Lead Capture
  { id: "lc-forms", categoryId: "lead-capture", label: "Enquiry form on the website", priority: "high", serviceIds: ["lead-forms"], autoCheck: "forms" },
  { id: "lc-whatsapp", categoryId: "lead-capture", label: "WhatsApp click-to-chat available", priority: "high", serviceIds: ["whatsapp-intake"], autoCheck: "whatsapp" },
  { id: "lc-click-to-call", categoryId: "lead-capture", label: "Click-to-call phone number", priority: "medium", serviceIds: ["call-tracking"], autoCheck: "tel" },
  { id: "lc-call-tracking", categoryId: "lead-capture", label: "Calls tracked by source or campaign", priority: "medium", serviceIds: ["call-tracking"] },
  { id: "lc-lead-quality", categoryId: "lead-capture", label: "Leads qualified before they reach sales", priority: "medium", serviceIds: ["crm-sales-automation", "whatsapp-automation"] },
  // Sales & CRM
  { id: "crm-system", categoryId: "sales-crm", label: "Leads stored in a CRM, not spreadsheets or chats", priority: "high", serviceIds: ["crm-setup"] },
  { id: "crm-response-time", categoryId: "sales-crm", label: "New enquiries answered within an hour", priority: "high", serviceIds: ["whatsapp-automation", "ai-business-automation", "crm-sales-automation"] },
  { id: "crm-follow-up", categoryId: "sales-crm", label: "Structured follow-up for leads that did not convert", priority: "high", serviceIds: ["crm-sales-automation", "email-sms-automation", "ai-business-automation"] },
  { id: "crm-pipeline", categoryId: "sales-crm", label: "Sales pipeline stages and conversion visible", priority: "medium", serviceIds: ["crm-sales-automation", "dashboards-reporting"] },
  // WhatsApp & Business Automation
  { id: "wa-business-api", categoryId: "whatsapp-automation", label: "WhatsApp Business account / API in use", priority: "medium", serviceIds: ["whatsapp-automation"] },
  { id: "wa-auto-replies", categoryId: "whatsapp-automation", label: "Automated replies, FAQs and routing", priority: "medium", serviceIds: ["whatsapp-automation", "ai-business-automation"] },
  { id: "wa-reminders", categoryId: "whatsapp-automation", label: "Automated reminders (appointments, payments, renewals)", priority: "medium", serviceIds: ["whatsapp-automation", "email-sms-automation"] },
  { id: "wa-ai-handling", categoryId: "whatsapp-automation", label: "AI handles repetitive enquiries and tasks", priority: "low", serviceIds: ["ai-business-automation"] },
  // Analytics & Measurement
  { id: "an-ga4", categoryId: "analytics", label: "GA4 analytics installed", priority: "high", serviceIds: ["ga4-gtm"], autoCheck: "ga4" },
  { id: "an-gtm", categoryId: "analytics", label: "Google Tag Manager in use", priority: "low", serviceIds: ["ga4-gtm"], autoCheck: "gtm" },
  { id: "an-conversions", categoryId: "analytics", label: "Conversions (forms, calls, WhatsApp) tracked as events", priority: "high", serviceIds: ["conversion-tracking-capi"] },
  { id: "an-capi", categoryId: "analytics", label: "Server-side / Conversions API for ad platforms", priority: "medium", serviceIds: ["conversion-tracking-capi"] },
  { id: "an-dashboard", categoryId: "analytics", label: "One dashboard showing cost per lead by source", priority: "high", serviceIds: ["dashboards-reporting"] },
  { id: "an-attribution", categoryId: "analytics", label: "Knows which channels produce customers, not just leads", priority: "high", serviceIds: ["dashboards-reporting", "strategy-consulting"] },
  // Growth Strategy
  { id: "gs-goals", categoryId: "growth-strategy", label: "Clear growth targets (enquiries, revenue, timeline)", priority: "medium", serviceIds: ["strategy-consulting"] },
  { id: "gs-testing", categoryId: "growth-strategy", label: "Regular testing and optimisation", priority: "low", serviceIds: ["cro-ab-testing"] },
  { id: "gs-budget", categoryId: "growth-strategy", label: "Marketing budget allocated by channel performance", priority: "medium", serviceIds: ["strategy-consulting", "dashboards-reporting"] },
  { id: "gs-online-learning", categoryId: "growth-strategy", label: "Online course or learning product (if relevant)", priority: "low", serviceIds: ["lms-online-learning"] },
  { id: "gs-team-training", categoryId: "growth-strategy", label: "Team trained to run digital and marketing tools", priority: "low", serviceIds: ["corporate-training"] },
];

export const BUSINESS_GOALS = [
  { id: "more-enquiries", label: "More enquiries" },
  { id: "better-lead-quality", label: "Better lead quality" },
  { id: "launch-new", label: "Launch something new" },
  { id: "sell-online", label: "Sell a course or product online" },
  { id: "improve-follow-up", label: "Follow up faster and better" },
  { id: "know-whats-working", label: "Know what's working" },
  { id: "local-visibility", label: "Show up locally / on Maps" },
  { id: "brand-awareness", label: "Brand awareness" },
  { id: "fill-capacity", label: "Fill empty slots or weekdays" },
  { id: "b2b-pipeline", label: "Build a B2B pipeline" },
] as const;

export type RuleTrigger =
  | { kind: "audit"; itemId: string; statuses: AuditStatus[]; weight: number }
  | { kind: "goal"; goalId: string; weight: number };

export type AuditStatus = "working_well" | "needs_improvement" | "missing" | "not_applicable" | "not_assessed";

const gap = (itemId: string, weight: number): RuleTrigger => ({ kind: "audit", itemId, statuses: ["missing", "needs_improvement"], weight });
const has = (itemId: string, weight: number): RuleTrigger => ({ kind: "audit", itemId, statuses: ["working_well"], weight });
const goal = (goalId: string, weight: number): RuleTrigger => ({ kind: "goal", goalId, weight });

export type RecommendationRuleSeed = {
  id: string;
  offerId: string;
  triggers: RuleTrigger[];
  minScore: number;
  outcome: string;
};

/**
 * One rule per packaged offer. Score = matched trigger weights + industry fit
 * + buyer-quote match. An offer is only recommended when at least one audit
 * gap matched or the client recognised the offer's buyer quote — industry
 * alone never recommends anything.
 */
export const RECOMMENDATION_RULES: RecommendationRuleSeed[] = [
  { id: "rule-clinic-patient-engine", offerId: "clinic-patient-engine", minScore: 6, outcome: "A steady flow of new-patient enquiries from search, captured on WhatsApp and attributed to source.",
    triggers: [gap("pa-google-ads", 3), gap("wc-landing-pages", 2), gap("wc-conversion-rate", 2), gap("lc-whatsapp", 2), gap("an-conversions", 3), goal("more-enquiries", 2), goal("fill-capacity", 2)] },
  { id: "rule-specialty-launch-film", offerId: "specialty-launch-film", minScore: 6, outcome: "Awareness for a new department or specialty, with content that keeps working after launch.",
    triggers: [gap("cc-video", 3), gap("cc-photography", 2), gap("cc-social-active", 2), gap("bp-trust-signals", 1), goal("launch-new", 4), goal("brand-awareness", 2)] },
  { id: "rule-study-abroad-intake-system", offerId: "study-abroad-intake-system", minScore: 6, outcome: "More enquiries converted into enrolled students through fast, structured follow-up.",
    triggers: [gap("crm-system", 3), gap("crm-follow-up", 3), gap("crm-response-time", 2), gap("pa-meta-ads", 2), gap("pa-google-ads", 1), gap("wa-business-api", 1), goal("better-lead-quality", 2), goal("improve-follow-up", 2), goal("more-enquiries", 1)] },
  { id: "rule-admissions-season-engine", offerId: "admissions-season-engine", minScore: 6, outcome: "A measured admissions season: video-led demand, WhatsApp follow-up and a CRM view of every applicant.",
    triggers: [gap("cc-video", 2), gap("pa-meta-ads", 3), gap("crm-system", 2), gap("wa-auto-replies", 2), gap("an-attribution", 2), goal("more-enquiries", 2), goal("know-whats-working", 2)] },
  { id: "rule-coaching-funnel-lms", offerId: "coaching-funnel-lms", minScore: 6, outcome: "A working online sales funnel for a course, delivered through an LMS with automated nurture.",
    triggers: [gap("gs-online-learning", 4), gap("wc-landing-pages", 2), gap("pa-meta-ads", 2), gap("crm-follow-up", 1), goal("sell-online", 4)] },
  { id: "rule-project-launch-package", offerId: "project-launch-package", minScore: 6, outcome: "A launch with aerial and video assets, a dedicated landing page, paid demand and CRM-tracked site visits.",
    triggers: [gap("cc-aerial", 2), gap("cc-video", 2), gap("wc-landing-pages", 2), gap("pa-meta-ads", 2), gap("pa-google-ads", 2), gap("crm-system", 2), goal("launch-new", 4)] },
  { id: "rule-interior-enquiry-system", offerId: "interior-enquiry-system", minScore: 6, outcome: "Fewer price shoppers: video pre-qualifies buyers and CRM follow-up works the serious ones.",
    triggers: [gap("lc-lead-quality", 4), gap("crm-follow-up", 3), gap("cc-video", 2), gap("pa-meta-ads", 1), goal("better-lead-quality", 3)] },
  { id: "rule-professional-services-enquiry-desk", offerId: "professional-services-enquiry-desk", minScore: 6, outcome: "Enquiries beyond word of mouth from exact-match search, with every call tracked.",
    triggers: [gap("pa-google-ads", 3), gap("wc-landing-pages", 2), gap("lc-call-tracking", 2), gap("an-dashboard", 2), gap("seo-ranking", 1), goal("more-enquiries", 2)] },
  { id: "rule-b2b-pipeline-build", offerId: "b2b-pipeline-build", minScore: 6, outcome: "Website traffic and outbound turned into a CRM-managed B2B pipeline.",
    triggers: [gap("wc-conversion-rate", 4), gap("wc-cta", 2), gap("pa-linkedin", 2), gap("crm-system", 2), gap("pa-google-ads", 1), goal("b2b-pipeline", 4), goal("more-enquiries", 1)] },
  { id: "rule-local-domination-pack", offerId: "local-domination-pack", minScore: 6, outcome: "Visible on Google Maps and local search, with reviews and calls that can be counted.",
    triggers: [gap("seo-gbp", 4), gap("seo-reviews", 3), gap("seo-ranking", 2), gap("lc-call-tracking", 1), goal("local-visibility", 4)] },
  { id: "rule-solar-home-services-lead-engine", offerId: "solar-home-services-lead-engine", minScore: 6, outcome: "Own lead flow from search and Maps instead of shared portal leads.",
    triggers: [gap("lc-lead-quality", 3), gap("pa-google-ads", 2), gap("seo-gbp", 2), gap("wc-landing-pages", 1), gap("lc-call-tracking", 2), goal("better-lead-quality", 3), goal("more-enquiries", 1)] },
  { id: "rule-hospitality-visibility-pack", offerId: "hospitality-visibility-pack", minScore: 6, outcome: "Weekday demand from fresh visuals, social, creators and a strong Maps listing.",
    triggers: [gap("cc-photography", 2), gap("cc-social-active", 2), gap("seo-gbp", 2), gap("seo-influencer", 2), goal("fill-capacity", 4), goal("brand-awareness", 2)] },
  { id: "rule-measurement-retainer", offerId: "measurement-retainer", minScore: 6, outcome: "Every enquiry attributed to its source, reported in one dashboard and reviewed monthly.",
    triggers: [gap("an-ga4", 3), gap("an-conversions", 4), gap("an-capi", 2), gap("an-dashboard", 3), gap("an-attribution", 3), has("pa-google-ads", 2), has("pa-meta-ads", 2), goal("know-whats-working", 4)] },
  { id: "rule-ai-follow-up-layer", offerId: "ai-follow-up-layer", minScore: 6, outcome: "Every enquiry answered and followed up automatically, across WhatsApp, email and SMS.",
    triggers: [gap("crm-response-time", 4), gap("crm-follow-up", 4), gap("wa-auto-replies", 2), gap("wa-ai-handling", 2), goal("improve-follow-up", 4)] },
];

/** A service that should normally not be sold without another being in place. */
export const DEPENDENCY_RULES = [
  { id: "dep-google-ads-tracking", serviceId: "google-ads", requiresServiceId: "conversion-tracking-capi", reason: "Paid search needs conversion tracking, or spend cannot be judged." },
  { id: "dep-meta-ads-tracking", serviceId: "meta-ads", requiresServiceId: "conversion-tracking-capi", reason: "Meta ads optimise on conversion events; without them the algorithm optimises for clicks." },
  { id: "dep-crm-automation-crm", serviceId: "crm-sales-automation", requiresServiceId: "crm-setup", reason: "Automation runs on top of a CRM." },
  { id: "dep-ai-crm", serviceId: "ai-business-automation", requiresServiceId: "crm-setup", reason: "AI follow-up needs a CRM to read from and write to." },
  { id: "dep-email-crm", serviceId: "email-sms-automation", requiresServiceId: "crm-setup", reason: "Email and SMS sequences need a contact database." },
  { id: "dep-dashboards-ga4", serviceId: "dashboards-reporting", requiresServiceId: "ga4-gtm", reason: "Dashboards need analytics data underneath." },
  { id: "dep-cro-ga4", serviceId: "cro-ab-testing", requiresServiceId: "ga4-gtm", reason: "A/B tests need analytics to measure results." },
  { id: "dep-capi-ga4", serviceId: "conversion-tracking-capi", requiresServiceId: "ga4-gtm", reason: "Conversion tracking is configured through GA4 and GTM." },
];

/**
 * Example calculator prices supplied in the build brief. Not approved list
 * prices — seeded as editable price options, labelled with their origin.
 */
export const BRIEF_EXAMPLE_PRICE_OPTIONS: Record<string, PriceOptionSeed[]> = {
  "video-production": [
    { id: "social-media-video", label: "Social media video", model: "per_unit", unitPrice: 3500, unitLabel: "video", source: "brief-example" },
    { id: "youtube-marketing-video", label: "YouTube marketing video", model: "per_unit", unitPrice: 5000, unitLabel: "video", source: "brief-example" },
  ],
  "meta-ads": [
    { id: "performance-management", label: "Performance marketing — management only", model: "monthly", monthlyFee: 50000, source: "brief-example" },
    { id: "performance-management-video", label: "Performance marketing — management + video production", model: "monthly", monthlyFee: 60000, source: "brief-example" },
  ],
  "google-ads": [
    { id: "performance-management", label: "Performance marketing — management only", model: "monthly", monthlyFee: 50000, source: "brief-example" },
    { id: "performance-management-video", label: "Performance marketing — management + video production", model: "monthly", monthlyFee: 60000, source: "brief-example" },
  ],
};

export type PricingModel = "per_unit" | "fixed_project" | "fixed_package" | "setup_plus_monthly" | "monthly" | "annual" | "custom";

export type PriceOptionSeed = {
  id: string;
  label: string;
  model: PricingModel;
  unitPrice?: number;
  unitLabel?: string;
  setupFee?: number;
  monthlyFee?: number;
  annualFee?: number;
  source: "brief-example" | "admin";
};

/** Keywords used to suggest an industry from website text. Suggestions only. */
export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  hospitals: ["hospital", "multispeciality", "multi-speciality", "multispecialty", "emergency care", "icu"],
  "single-specialty-clinics": ["clinic", "orthopaedic", "orthopedic", "cardiology", "ent clinic", "eye clinic", "gynaec", "paediatric", "pediatric"],
  "dental-clinics": ["dental", "dentist", "orthodont", "root canal", "dental implant", "teeth"],
  "skin-hair-clinics": ["dermatolog", "skin clinic", "hair transplant", "hair clinic", "cosmetolog", "laser hair"],
  "fertility-ivf-centres": ["ivf", "fertility", "iui", "infertility"],
  "diagnostic-labs": ["diagnostic", "pathology", "blood test", "lab test", "scan centre", "radiology"],
  "physiotherapy-rehab": ["physiotherapy", "physio", "rehabilitation", "rehab"],
  "senior-care-home-nursing": ["home nursing", "elder care", "senior care", "caregiver", "home care"],
  "veterinary-pet-care": ["veterinary", "vet clinic", "pet care", "pet grooming", "animal hospital"],
  schools: ["school", "cbse", "icse", "igcse", "kindergarten to"],
  colleges: ["college", "university", "undergraduate", "postgraduate", "b.tech", "mba programme"],
  "coaching-institutes": ["coaching", "tuition", "classes for"],
  "study-abroad-consultants": ["study abroad", "overseas education", "student visa", "ielts", "study in uk", "study in canada"],
  "preschools-daycare": ["preschool", "play school", "playschool", "daycare", "day care", "montessori"],
  "test-prep-centres": ["neet", "jee", "cat prep", "gmat", "gre", "upsc", "test prep"],
  "arts-music-academies": ["music academy", "dance", "art classes", "guitar", "keyboard classes", "bharatanatyam"],
  "corporate-training-firms": ["corporate training", "soft skills", "leadership training", "workshops for teams"],
  "real-estate-developers": ["apartments", "villas", "plots", "rera", "luxury homes", "gated community", "real estate"],
  "construction-firms": ["construction", "builders", "turnkey", "civil works"],
  "interior-designers": ["interior design", "interiors", "home interiors", "interior designer"],
  architects: ["architect", "architecture"],
  "modular-kitchen-furniture": ["modular kitchen", "wardrobe", "furniture"],
  "resale-brokers": ["resale", "property broker", "buy sell rent", "property consultant"],
  "commercial-contractors": ["commercial interiors", "fit-out", "fitout", "contractor"],
  "co-working-spaces": ["coworking", "co-working", "shared office", "hot desk"],
  "ca-cfo-firms": ["chartered accountant", "ca firm", "gst filing", "virtual cfo", "audit and assurance", "income tax"],
  "legal-firms": ["advocate", "law firm", "legal services", "lawyer", "attorney"],
  "business-consultants": ["business consulting", "management consulting", "consultancy"],
  "recruitment-agencies": ["recruitment", "staffing", "placement", "hiring solutions", "manpower"],
  "insurance-advisors": ["insurance advisor", "life insurance", "health insurance", "lic agent"],
  "loan-consultants-dsas": ["home loan", "personal loan", "business loan", "loan against property", "dsa"],
  "printing-packaging": ["printing", "packaging", "offset", "labels"],
  "manufacturing-industrial": ["manufacturer", "manufacturing", "industrial", "machinery", "fabrication"],
  "restaurants-cloud-kitchens": ["restaurant", "cloud kitchen", "dine-in", "menu", "cafe", "biryani"],
  "hotels-resorts": ["hotel", "resort", "rooms", "stay", "homestay", "book your stay"],
  "travel-operators": ["tour package", "travel agency", "holiday package", "tours and travels"],
  "gyms-fitness-studios": ["gym", "fitness", "crossfit", "yoga studio", "personal training"],
  "salons-spas": ["salon", "spa", "unisex salon", "bridal makeup", "beauty parlour"],
  "jewellery-brands": ["jewellery", "jewelry", "gold", "diamond", "bridal jewellery"],
  "textile-saree-brands": ["saree", "sarees", "silk", "ethnic wear", "handloom", "textile"],
  "automobile-dealers": ["showroom", "test drive", "dealership", "two wheeler", "cars"],
  "home-services": ["pest control", "plumbing", "electrician", "cleaning services", "ac repair", "home services"],
  "solar-installers": ["solar", "rooftop solar", "solar panel", "on-grid", "net metering"],
  "wedding-event-services": ["wedding", "event management", "decor", "wedding photography", "catering"],
};

export const DEFAULT_SETTINGS = {
  revenue: {
    targetMonthly: 300000,
    targetDate: "2027-01-23",
    windowStart: "2026-10-25",
    startingSigned: 25000,
    startingSignedClients: 1,
    profitFloorMonthly: 30000,
  },
  tax: { enabled: true, label: "GST", ratePercent: 18, note: "Default rate — confirm with your accountant." },
  pricing: { consultantMaxDiscountPercent: 10, currency: "INR" },
  /** Morning-page pace assumptions: average retainer (₹/month) and the board's 1-in-5 close rate. */
  plan: { avgRetainer: 50000, closeRate: 0.2, timeZone: "Asia/Kolkata" },
  quote: {
    validityDays: 15,
    numberPrefix: "MPQ",
    paymentTerms:
      "One-time and setup fees: 100% before work starts. Monthly fees: billed in advance at the start of each billing period. Invoices payable within 7 days.",
    assumptions:
      "Prices are based on the scope discussed during discovery. Content approvals, access to accounts and brand assets are provided by the client on time.",
    exclusions:
      "Advertising spend is paid by the client directly to the platforms. Third-party tools, software subscriptions, stock media and paid listings are billed at actuals unless stated.",
    nextSteps:
      "1. Confirm the scope and start date.\n2. Sign the acceptance and pay the initial invoice.\n3. Kick-off call and account access within 3 working days.",
    firstRecurringDueUpfront: true,
  },
  company: {
    name: "Measure Pixel",
    email: "",
    phone: "",
    website: "",
    address: "",
    gstin: "",
  },
};

export type AppSettings = typeof DEFAULT_SETTINGS;
