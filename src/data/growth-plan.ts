/**
 * Measure Pixel 90-day visibility & revenue plan (29 Oct 2026 → 26 Jan 2027),
 * built from the founder's 29 Oct morning notes and the Opportunity Board.
 *
 * Seasonal windows are planning assumptions for Chennai / Tamil Nadu, not
 * measured demand: verify against your own pipeline and adjust in code or
 * Settings. Festival dates are for 2026–27.
 */

export const PLAN = {
  start: "2026-10-29",
  days: 90,
  northStar: "₹3,00,000 / month recurring by 23 January 2027",
  audience: "Owners, founders and business-development heads of established businesses that can invest in premium, retainer-based growth work.",
  positioning: "Measure Pixel builds measurable growth systems: we find where enquiries leak, fix the system, and prove it with numbers.",
};

export type Phase = { id: string; name: string; fromDay: number; toDay: number; goal: string; milestones: string[] };

export const PHASES: Phase[] = [
  {
    id: "foundation", name: "Foundation", fromDay: 1, toDay: 14,
    goal: "Be findable and credible, build the list of 100 decision-makers, start real conversations.",
    milestones: [
      "Measure Pixel Google Business Profile, LinkedIn and Instagram bios say the same one-line promise",
      "Prospect list: 100 named decision-makers across the season's industries",
      "Run 20 automatic audits on prospects; send 10 personalised findings",
      "6 discovery conversations booked",
    ],
  },
  {
    id: "visibility", name: "Visibility engine", fromDay: 15, toDay: 42,
    goal: "Show up every day where owners look; turn audits into meetings.",
    milestones: [
      "3 LinkedIn posts, 3 reels and 1 YouTube video every week, every week",
      "One industry page per priority vertical on the website (clinic, real estate, education, hospitality)",
      "12 discovery conversations; 5 proposals sent",
      "2 retainers signed",
    ],
  },
  {
    id: "close", name: "Proposals & closing", fromDay: 43, toDay: 70,
    goal: "Convert pipeline before the New Year budget cycle; anchor clients for Jan–Mar seasons.",
    milestones: [
      "Every open proposal followed up within 48 hours",
      "First case study published (numbers, before/after)",
      "Total 5 retainers signed",
      "Pongal / New Year campaigns sold to festive-season clients",
    ],
  },
  {
    id: "target", name: "Close the gap", fromDay: 71, toDay: 90,
    goal: "Hit ₹3L/month, systemise delivery, set up the next 90 days.",
    milestones: [
      "₹3,00,000/month signed",
      "Delivery SOPs written for the top 3 offers",
      "Referral ask to every happy client",
      "Next 90-day plan written",
    ],
  },
];

export type Season = {
  id: string;
  name: string;
  /** Inclusive MM-DD window; may wrap the year end. */
  from: string;
  to: string;
  happening: string;
  industries: string[]; // industry ids from the Opportunity Board
  decisionMakers: string;
  leadOffer: string; // offer id
  /** What the decision-maker types when looking for someone like us. */
  searches: string[];
  angle: string;
};

export const SEASONS: Season[] = [
  {
    id: "festive-wedding", name: "Festive & wedding season", from: "10-15", to: "02-28",
    happening: "Diwali, wedding muhurtams and year-end gifting drive retail and venue demand; brands spend on campaigns now.",
    industries: ["jewellery-brands", "textile-saree-brands", "wedding-event-services", "salons-spas", "restaurants-cloud-kitchens"],
    decisionMakers: "Founder, retail director, marketing head",
    leadOffer: "hospitality-visibility-pack",
    searches: ["digital marketing agency for jewellery brand", "wedding season ad campaign agency", "instagram marketing for saree brand", "social media agency chennai for retail"],
    angle: "Show the cost of a missed wedding-season week: footfall and enquiries lost to brands that advertise.",
  },
  {
    id: "travel-peak", name: "Holiday travel peak", from: "11-15", to: "01-20",
    happening: "December–January holidays; properties that rely on OTAs give away commission on bookings they could take direct.",
    industries: ["hotels-resorts", "travel-operators", "restaurants-cloud-kitchens"],
    decisionMakers: "Owner, general manager, revenue manager",
    leadOffer: "hospitality-visibility-pack",
    searches: ["hotel digital marketing agency", "increase direct bookings hotel", "resort marketing company"],
    angle: "Weekday occupancy and direct bookings: what an OTA commission costs per month.",
  },
  {
    id: "admissions", name: "Admissions planning", from: "11-01", to: "03-31",
    happening: "Schools and colleges set admission budgets now; enquiries peak January–March.",
    industries: ["schools", "colleges", "preschools-daycare"],
    decisionMakers: "Correspondent, principal, admissions head",
    leadOffer: "admissions-season-engine",
    searches: ["school admission marketing agency", "admission lead generation for colleges", "digital marketing for schools chennai"],
    angle: "Admissions that leak between enquiry and campus visit; WhatsApp follow-up as the fix.",
  },
  {
    id: "launches", name: "New-year project launches", from: "11-15", to: "03-31",
    happening: "Developers time launches for New Year, Pongal and the January–March booking window.",
    industries: ["real-estate-developers", "construction-firms", "interior-designers", "modular-kitchen-furniture"],
    decisionMakers: "Managing director, sales & marketing head, founder",
    leadOffer: "project-launch-package",
    searches: ["real estate marketing agency chennai", "real estate lead generation company", "site visit leads for apartments"],
    angle: "Cost per site visit, not cost per lead: how launches waste budget on leads that never visit.",
  },
  {
    id: "budget-cycle", name: "Year-end & FY budget planning", from: "12-01", to: "03-31",
    happening: "B2B firms close the year and set next-year budgets January–March; Union Budget on 1 February.",
    industries: ["ca-cfo-firms", "manufacturing-industrial", "corporate-training-firms", "recruitment-agencies", "business-consultants"],
    decisionMakers: "Promoter, managing partner, business-development head",
    leadOffer: "b2b-pipeline-build",
    searches: ["b2b lead generation company india", "linkedin marketing agency", "google ads for manufacturers", "lead generation for CA firms"],
    angle: "Word-of-mouth ceilings: a measurable second pipeline before next financial year.",
  },
  {
    id: "new-year-fitness", name: "New Year fitness & wellness", from: "12-15", to: "02-15",
    happening: "Resolution season: gyms, studios and wellness brands get their highest-intent searches in January.",
    industries: ["gyms-fitness-studios", "salons-spas", "physiotherapy-rehab"],
    decisionMakers: "Owner, centre manager",
    leadOffer: "local-domination-pack",
    searches: ["gym marketing agency", "fitness studio lead generation", "google maps ranking for gym"],
    angle: "Show up on Maps on 1 January; trial-to-membership follow-up.",
  },
  {
    id: "study-abroad", name: "Study-abroad application season", from: "12-01", to: "04-30",
    happening: "Students apply for the September intake; counsellors compete on response speed.",
    industries: ["study-abroad-consultants", "test-prep-centres", "coaching-institutes"],
    decisionMakers: "Founder, branch head",
    leadOffer: "study-abroad-intake-system",
    searches: ["lead generation for study abroad consultants", "crm for education consultants", "meta ads for overseas education"],
    angle: "Speed-to-lead: the counsellor who replies first wins the student.",
  },
  {
    id: "healthcare", name: "Healthcare (all year)", from: "01-01", to: "12-31",
    happening: "Clinics add doctors and departments year-round; the board's cash tier.",
    industries: ["dental-clinics", "skin-hair-clinics", "single-specialty-clinics", "fertility-ivf-centres", "hospitals"],
    decisionMakers: "Clinic owner, medical director, hospital marketing head",
    leadOffer: "clinic-patient-engine",
    searches: ["dental clinic marketing agency", "patient acquisition for clinics", "healthcare digital marketing chennai"],
    angle: "Empty appointment slots for the new doctor: what one extra patient a day is worth.",
  },
  {
    id: "solar-summer", name: "Summer prep: solar & home services", from: "01-01", to: "05-31",
    happening: "Summer power demand and AC season; installers plan campaigns from January.",
    industries: ["solar-installers", "home-services"],
    decisionMakers: "Owner, sales head",
    leadOffer: "solar-home-services-lead-engine",
    searches: ["solar leads generation", "lead generation for home services", "google ads for solar company"],
    angle: "Own your leads instead of buying shared portal leads.",
  },
];

export const EVENTS: { date: string; name: string; note: string }[] = [
  { date: "2026-11-08", name: "Diwali", note: "Festive campaigns peak; prospects busy — send audits after, not during." },
  { date: "2026-11-14", name: "Children's Day", note: "Schools and preschools: content hook." },
  { date: "2026-12-25", name: "Christmas", note: "Hospitality and retail peak." },
  { date: "2027-01-01", name: "New Year", note: "Fitness, real-estate and budget-reset conversations." },
  { date: "2027-01-14", name: "Pongal", note: "Tamil Nadu's biggest buying window: real estate, jewellery, sarees, vehicles." },
  { date: "2027-01-23", name: "₹3L target date", note: "North-star deadline." },
  { date: "2027-01-26", name: "Republic Day · day 90", note: "Plan review; write the next 90 days." },
  { date: "2027-02-01", name: "Union Budget", note: "B2B and finance content hook." },
];

export const CONTENT_PILLARS = [
  { id: "growth", name: "Business growth", promptHint: "Why businesses get enquiries but struggle to close" },
  { id: "economics", name: "Marketing economics", promptHint: "What to measure before increasing ad spend" },
  { id: "industry", name: "Industry insight", promptHint: "One fix for this season's priority industry" },
  { id: "systems", name: "Systems & automation", promptHint: "How to stop losing leads to slow follow-up" },
  { id: "behind", name: "Behind the scenes", promptHint: "How Measure Pixel audits and builds a growth system" },
];

export type DailyTask = { key: string; channel: "CEO" | "LinkedIn" | "Instagram" | "YouTube" | "BNI" | "Pipeline"; text: string; minutes: number };

/** Weekday rhythm: 0 = Sunday … 6 = Saturday. Every working day also gets the daily non-negotiables. */
export const WEEKLY_RHYTHM: Record<number, DailyTask[]> = {
  0: [
    { key: "sun-plan", channel: "CEO", text: "Review the week: signed revenue, conversations, proposals. Set Monday's three priorities.", minutes: 30 },
    { key: "sun-batch", channel: "Instagram", text: "Batch-script three reels for the week from this season's angle.", minutes: 45 },
  ],
  1: [
    { key: "mon-li", channel: "LinkedIn", text: "Post an insight on {pillar}, written for {decisionMakers} in {industry}.", minutes: 30 },
    { key: "mon-audits", channel: "Pipeline", text: "Run 3 automatic audits on prospects from {industry}; pick the biggest gap in each.", minutes: 30 },
  ],
  2: [
    { key: "tue-reel", channel: "Instagram", text: "Publish a 30-second audit teardown reel: one fixable leak in a {industry} business (no names).", minutes: 40 },
    { key: "tue-send", channel: "Pipeline", text: "Send 2 personalised audit findings to decision-makers with a 15-minute call ask.", minutes: 30 },
  ],
  3: [
    { key: "wed-li", channel: "LinkedIn", text: "Post a short case or teardown: {angle}", minutes: 30 },
    { key: "wed-comment", channel: "LinkedIn", text: "Comment thoughtfully on 10 posts by owners and BD heads in {industry}.", minutes: 20 },
  ],
  4: [
    { key: "thu-reel", channel: "Instagram", text: "Publish a reel on {pillar} for {industry} owners.", minutes: 40 },
    { key: "thu-bni", channel: "BNI", text: "Make one specific referral ask: an introduction to a {decisionMakersShort} at a {industry} business planning {season}.", minutes: 15 },
  ],
  5: [
    { key: "fri-li", channel: "LinkedIn", text: "Post on {pillar}: a number, a lesson, a question.", minutes: 30 },
    { key: "fri-proposals", channel: "Pipeline", text: "Turn every completed discovery call this week into a quotation; follow up every sent proposal.", minutes: 45 },
    { key: "fri-short", channel: "YouTube", text: "Publish a YouTube Short cut from this week's reel.", minutes: 15 },
  ],
  6: [
    { key: "sat-yt", channel: "YouTube", text: "Record one long-form video: “How a {industry} business can {searchIntent}”.", minutes: 90 },
    { key: "sat-income", channel: "CEO", text: "Income-stream review: one action on a non-retainer stream (consulting, YouTube, digital product).", minutes: 30 },
  ],
};

export const DAILY_NON_NEGOTIABLES: DailyTask[] = [
  { key: "daily-conversation", channel: "CEO", text: "Have one real conversation with a decision-maker (call, meeting or voice note exchange).", minutes: 30 },
  { key: "daily-touches", channel: "Pipeline", text: "Five targeted touches to people on the prospect list (DM, comment, WhatsApp, intro request).", minutes: 25 },
  { key: "daily-followups", channel: "Pipeline", text: "Clear every follow-up due today.", minutes: 15 },
];

export type IncomeStream = { id: string; name: string; role: string; day30: string; day60: string; day90: string; weekly: string };

export const INCOME_STREAMS: IncomeStream[] = [
  { id: "retainers", name: "Agency retainers", role: "Primary engine — the ₹3L/month target", day30: "2 retainers signed", day60: "5 retainers", day90: "₹3L/month signed", weekly: "3 discovery conversations, 1–2 proposals" },
  { id: "projects", name: "Projects: websites, branding, video, drone, 3D", role: "Attach to retainers; one-time cash", day30: "Every proposal offers one relevant project add-on", day60: "2 projects sold", day90: "Project portfolio page live", weekly: "Quote project work separately from monthly fees" },
  { id: "consulting", name: "Paid growth audits & consulting", role: "Paid entry point that converts into retainers", day30: "Paid audit offer written and priced", day60: "3 paid audits", day90: "Audit → retainer conversion tracked", weekly: "Offer a paid deep-dive when a free audit shows a big gap" },
  { id: "coaching", name: "Coaching & mentorship", role: "Authority and network reach", day30: "One workshop topic chosen (e.g. lead follow-up systems)", day60: "First workshop at BNI / business association", day90: "Workshop repeated; leads captured", weekly: "Collect questions owners ask for the workshop" },
  { id: "youtube", name: "YouTube", role: "Visibility first, income later", day30: "4 long-form videos, 8 Shorts", day60: "8 long-form videos", day90: "12 long-form videos; analyse what owners watch", weekly: "1 long-form + 2 Shorts" },
  { id: "brand-deals", name: "Brand deals & affiliates", role: "Follows audience size", day30: "List tools you already recommend (CRM, website builders, WhatsApp API)", day60: "Apply to 3 affiliate programmes", day90: "First affiliate link in YouTube descriptions", weekly: "Mention tools honestly where they help" },
  { id: "digital-products", name: "Digital products", role: "Packages what you already know", day30: "Pick one: audit checklist, WhatsApp follow-up scripts, or proposal templates", day60: "Product drafted", day90: "Product launched to your audience", weekly: "Save every reusable template you create for clients" },
];

/** Where premium decision-makers look for providers, and how to be there. */
export const VISIBILITY_PLAYS = [
  { channel: "Google search & Maps", play: "Measure Pixel Google Business Profile with weekly posts and reviews; one landing page per priority industry targeting the searches above.", cadence: "Weekly" },
  { channel: "LinkedIn", play: "Founder posts for owners and BD heads; comments on their posts; direct messages with a specific audit finding.", cadence: "3 posts + 10 comments / week" },
  { channel: "Instagram", play: "Audit-teardown reels and behind-the-scenes; profile bio states the one-line promise and a WhatsApp link.", cadence: "3 reels / week" },
  { channel: "YouTube", play: "Long-form answers to the exact searches decision-makers type; Shorts cut from reels.", cadence: "1 long + 2 Shorts / week" },
  { channel: "BNI & in person", play: "One specific referral ask every meeting; 1-to-1s with members who serve the same buyers (CAs, architects, interior designers).", cadence: "Weekly" },
  { channel: "Partnerships", play: "Agencies and freelancers who need delivery partners; professionals who advise owners (CAs, consultants).", cadence: "2 new partner conversations / month" },
];
