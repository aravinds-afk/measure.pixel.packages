// Profession knowledge base: categories, contact-sphere templates, referral triggers and
// collaboration patterns. This is general referral-marketing knowledge, not member data.
// Anything derived from it is labelled "profession knowledge" in reports, never as a fact about a member.

import { clean } from "./normalize.ts";

export interface CategoryDef {
  id: string;
  name: string;
  aliases: string[];
  icon: string; // lucide icon name
  spheres: string[];
  summary: string;
  typicalCustomers: string[];
  typicalProblems: string[];
  idealReferral: string;
  triggerWords: string[];
  qualificationQuestions: string[];
}

export interface SphereDef {
  id: string;
  name: string;
  description: string;
  /** Why each category belongs to the sphere. */
  roles: Record<string, string>;
}

export interface TriggerDef {
  id: string;
  situation: string;
  spottedBy: string[];
  needs: string[];
  words: string[];
}

export interface CollaborationDef {
  a: string;
  b: string;
  idea: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "digital_marketing", name: "Digital Marketing Consultant", icon: "Megaphone",
    aliases: ["digital marketing", "digital marketer", "marketing agency", "performance marketing", "seo", "social media marketing", "online marketing", "marketing consultant", "digital marketing agency", "growth marketing"],
    spheres: ["business_growth", "technology", "events_branding"],
    summary: "Generates and converts demand through search, social, paid media and marketing automation.",
    typicalCustomers: ["small and medium businesses", "startups", "ecommerce brands", "professional services firms"],
    typicalProblems: ["not enough qualified leads", "low website conversion", "poor online visibility", "no follow-up system for enquiries"],
    idealReferral: "An owner who wants more qualified enquiries and already has a product that sells, but no predictable lead-generation system.",
    triggerWords: ["not getting enough leads", "our website doesn't bring business", "we rely on word of mouth", "launching a new product", "ads aren't working"],
    qualificationQuestions: ["Where do most of your new customers come from today?", "Do you track how many enquiries you get each month?", "Have you tried paid ads or SEO before, and what happened?"],
  },
  {
    id: "web_development", name: "Website Development Company", icon: "Code2",
    aliases: ["web development", "web developer", "website design", "web design", "website developer", "app development", "software development", "web agency"],
    spheres: ["business_growth", "technology"],
    summary: "Designs and builds websites, e-commerce stores and web applications.",
    typicalCustomers: ["small and medium businesses", "startups", "ecommerce brands", "professional services firms"],
    typicalProblems: ["outdated website", "slow or broken website", "no online ordering or booking", "manual processes that need a web app"],
    idealReferral: "A business embarrassed by its current website or about to launch a new brand, product line or online store.",
    triggerWords: ["our website is outdated", "rebranding", "we want to sell online", "the site is slow", "launching a new business"],
    qualificationQuestions: ["When was your website last rebuilt?", "Do you need customers to book, pay or order online?", "Who maintains the site today?"],
  },
  {
    id: "chartered_accountant", name: "Chartered Accountant", icon: "Calculator",
    aliases: ["accountant", "ca", "chartered accountant", "accounting", "tax consultant", "tax advisor", "auditor", "bookkeeping", "gst consultant", "cpa"],
    spheres: ["business_growth", "finance_wealth"],
    summary: "Handles accounting, tax, audit and statutory compliance.",
    typicalCustomers: ["small and medium businesses", "startups", "professionals", "high net worth individuals"],
    typicalProblems: ["tax compliance", "messy books", "audit readiness", "company registration", "GST filings"],
    idealReferral: "A growing business owner whose bookkeeping or tax compliance is handled informally or is falling behind.",
    triggerWords: ["tax notice", "starting a company", "my books are a mess", "year-end", "GST problem", "changing accountants"],
    qualificationQuestions: ["Who handles your books and tax filings today?", "Have you had any notices or late filings this year?", "Are you planning to raise funds or take a loan in the next year?"],
  },
  {
    id: "virtual_cfo", name: "Virtual CFO", icon: "LineChart",
    aliases: ["virtual cfo", "cfo services", "fractional cfo", "financial consultant", "finance consultant", "outsourced cfo"],
    spheres: ["business_growth", "finance_wealth"],
    summary: "Provides part-time CFO services: cash-flow planning, MIS, budgeting and fundraising support.",
    typicalCustomers: ["small and medium businesses", "startups"],
    typicalProblems: ["poor cash-flow visibility", "no monthly MIS", "fundraising preparation", "pricing and margin problems"],
    idealReferral: "A founder of a business doing meaningful revenue who cannot answer 'how much cash will we have in 90 days?'.",
    triggerWords: ["cash is tight", "raising funds", "we don't know our margins", "investors asked for numbers", "growing fast"],
    qualificationQuestions: ["Do you get a monthly management report?", "Are you planning to raise capital?", "How far ahead can you forecast cash?"],
  },
  {
    id: "business_lawyer", name: "Business Lawyer", icon: "Scale",
    aliases: ["lawyer", "advocate", "corporate lawyer", "business lawyer", "legal consultant", "solicitor", "attorney", "legal services", "law firm"],
    spheres: ["business_growth", "finance_wealth"],
    summary: "Drafts contracts, structures companies, protects IP and resolves commercial disputes.",
    typicalCustomers: ["small and medium businesses", "startups", "enterprises"],
    typicalProblems: ["unclear contracts", "partner disputes", "IP protection", "employment agreements", "fundraising documents"],
    idealReferral: "A business signing a significant contract, bringing in a partner or investor, or facing a payment dispute.",
    triggerWords: ["signing a big contract", "taking on a partner", "client isn't paying", "trademark", "shareholder agreement"],
    qualificationQuestions: ["Do you use written contracts with clients and suppliers?", "Are you bringing in partners or investors?", "Is there a dispute you are trying to resolve?"],
  },
  {
    id: "hr_consultant", name: "HR Consultant", icon: "Users",
    aliases: ["hr consultant", "human resources", "hr services", "hr advisor", "payroll services", "people consultant", "hr outsourcing"],
    spheres: ["business_growth", "workplace_operations"],
    summary: "Sets up HR policies, payroll, performance systems and labour-law compliance.",
    typicalCustomers: ["small and medium businesses", "startups"],
    typicalProblems: ["no HR policies", "high attrition", "payroll compliance", "performance reviews", "labour law"],
    idealReferral: "A company that has crossed 20 employees without formal HR policies or a payroll process.",
    triggerWords: ["people keep leaving", "hiring a lot", "employee dispute", "we have no HR", "payroll headache"],
    qualificationQuestions: ["How many employees do you have?", "Do you have written HR policies?", "Who runs payroll and statutory compliance?"],
  },
  {
    id: "recruitment", name: "Recruitment & Staffing Agency", icon: "UserPlus",
    aliases: ["recruitment", "recruiter", "staffing", "placement agency", "headhunter", "manpower", "talent acquisition", "executive search"],
    spheres: ["workplace_operations"],
    summary: "Sources, screens and places permanent and contract staff.",
    typicalCustomers: ["small and medium businesses", "enterprises", "startups"],
    typicalProblems: ["hard-to-fill roles", "slow hiring", "bulk hiring", "leadership hiring"],
    idealReferral: "A business expanding a team or opening a new location that needs several hires quickly.",
    triggerWords: ["we can't find good people", "hiring", "new branch", "someone just resigned", "scaling the team"],
    qualificationQuestions: ["Which roles are open right now?", "How long have they been open?", "Are you hiring for a new location?"],
  },
  {
    id: "business_loan_advisor", name: "Business Loan Advisor", icon: "Landmark",
    aliases: ["loan advisor", "business loans", "loan consultant", "finance broker", "loan syndication", "working capital loans", "dsa", "funding advisor", "commercial finance"],
    spheres: ["business_growth", "finance_wealth"],
    summary: "Arranges working capital, term loans, equipment finance and government-scheme funding.",
    typicalCustomers: ["small and medium businesses", "manufacturers", "retailers"],
    typicalProblems: ["working-capital gaps", "funding for expansion", "equipment purchase", "loan rejections"],
    idealReferral: "An owner planning expansion, buying machinery or premises, or struggling with working capital.",
    triggerWords: ["need funds", "bank rejected us", "buying machinery", "expansion plans", "cash-flow gap"],
    qualificationQuestions: ["What would you do with additional funding?", "Have you approached a bank recently?", "Are your last two years' financials filed?"],
  },
  {
    id: "corporate_insurance", name: "Corporate Insurance Advisor", icon: "ShieldCheck",
    aliases: ["insurance", "insurance advisor", "insurance agent", "general insurance", "commercial insurance", "insurance broker", "corporate insurance", "business insurance"],
    spheres: ["business_growth", "finance_wealth", "workplace_operations"],
    summary: "Covers businesses for property, liability, cyber, marine, group health and key-person risk.",
    typicalCustomers: ["small and medium businesses", "manufacturers", "enterprises"],
    typicalProblems: ["under-insured assets", "group health for employees", "liability exposure", "claims rejected"],
    idealReferral: "A business that has just bought assets, taken a new premises, signed a large contract or crossed 10 employees.",
    triggerWords: ["new office", "new machinery", "client requires insurance", "claim was rejected", "employee health cover"],
    qualificationQuestions: ["When did you last review your business insurance?", "Do your contracts require liability cover?", "Do employees have group health cover?"],
  },
  {
    id: "commercial_real_estate", name: "Commercial Real Estate Agent", icon: "Building2",
    aliases: ["commercial real estate", "office space", "commercial property", "property consultant", "commercial broker", "coworking", "industrial property", "leasing consultant"],
    spheres: ["property_construction", "workplace_operations"],
    summary: "Finds, leases and sells offices, shops, warehouses and industrial units.",
    typicalCustomers: ["small and medium businesses", "enterprises", "retailers", "property owners"],
    typicalProblems: ["outgrowing current office", "finding the right location", "lease negotiation", "selling commercial property"],
    idealReferral: "A business that has outgrown its space, is opening a branch, or a property owner with a vacant commercial unit.",
    triggerWords: ["running out of space", "lease is ending", "opening a branch", "new warehouse", "vacant property"],
    qualificationQuestions: ["When does your current lease end?", "How much space will you need in 12 months?", "Which locations are you considering?"],
  },
  {
    id: "residential_real_estate", name: "Residential Real Estate Agent", icon: "Home",
    aliases: ["real estate agent", "realtor", "residential real estate", "property dealer", "real estate broker", "estate agent", "real estate"],
    spheres: ["property_construction"],
    summary: "Helps families buy, sell and rent homes.",
    typicalCustomers: ["home buyers", "homeowners", "property owners", "professionals"],
    typicalProblems: ["finding the right home", "selling a property", "relocation", "rental management"],
    idealReferral: "A family relocating, upsizing or downsizing, or a homeowner thinking about selling.",
    triggerWords: ["we're moving", "relocating", "baby on the way", "selling our flat", "looking for a bigger home"],
    qualificationQuestions: ["Are you buying, selling or renting?", "What is your timeline?", "Have you been pre-approved for a loan?"],
  },
  {
    id: "mortgage_broker", name: "Home Loan / Mortgage Advisor", icon: "KeyRound",
    aliases: ["mortgage", "mortgage broker", "home loan", "home loans", "housing finance", "home loan advisor", "loan against property"],
    spheres: ["property_construction", "finance_wealth"],
    summary: "Arranges home loans, balance transfers and loans against property.",
    typicalCustomers: ["home buyers", "homeowners", "professionals"],
    typicalProblems: ["loan eligibility", "high interest rates", "loan rejections", "balance transfer"],
    idealReferral: "Someone who has shortlisted a property or is paying a high interest rate on an existing home loan.",
    triggerWords: ["buying a house", "my EMI is too high", "loan got rejected", "booked a flat", "refinance"],
    qualificationQuestions: ["Have you identified a property?", "What is your current interest rate?", "Are you salaried or self-employed?"],
  },
  {
    id: "architect", name: "Architect", icon: "Ruler",
    aliases: ["architect", "architecture", "architectural firm", "architectural design"],
    spheres: ["property_construction"],
    summary: "Designs residential, commercial and industrial buildings and manages approvals.",
    typicalCustomers: ["homeowners", "real estate developers", "small and medium businesses", "property owners"],
    typicalProblems: ["designing a new building", "approvals", "space planning", "renovation design"],
    idealReferral: "Anyone who owns a plot, is planning a new building, or needs a major renovation with approvals.",
    triggerWords: ["bought a plot", "building a house", "new factory", "need approvals", "major renovation"],
    qualificationQuestions: ["Do you already own the site?", "What is the approximate built-up area?", "When do you want to start construction?"],
  },
  {
    id: "interior_designer", name: "Interior Designer", icon: "Sofa",
    aliases: ["interior designer", "interior design", "interiors", "office interiors", "home interiors", "fit-out", "space design"],
    spheres: ["property_construction"],
    summary: "Designs and executes home and office interiors.",
    typicalCustomers: ["homeowners", "home buyers", "small and medium businesses", "retailers"],
    typicalProblems: ["new home setup", "office fit-out", "showroom design", "renovation"],
    idealReferral: "Someone who has just bought or leased a property and hasn't yet chosen who will do the interiors.",
    triggerWords: ["just got the keys", "moving into a new office", "renovating", "opening a showroom", "new flat"],
    qualificationQuestions: ["When do you get possession?", "Is this a full fit-out or a refresh?", "What is your budget range?"],
  },
  {
    id: "general_contractor", name: "Civil / General Contractor", icon: "HardHat",
    aliases: ["contractor", "builder", "civil contractor", "construction company", "general contractor", "construction", "renovation contractor"],
    spheres: ["property_construction"],
    summary: "Executes construction, renovation and repair projects.",
    typicalCustomers: ["homeowners", "property owners", "small and medium businesses", "real estate developers"],
    typicalProblems: ["construction execution", "renovation", "repairs", "project delays"],
    idealReferral: "An owner with approved plans who needs a reliable team to build or renovate on time.",
    triggerWords: ["starting construction", "renovation", "leakage", "extension", "contractor let us down"],
    qualificationQuestions: ["Are the drawings and approvals ready?", "What is the scope of work?", "What is your target completion date?"],
  },
  {
    id: "electrical_contractor", name: "Electrical Contractor", icon: "Zap",
    aliases: ["electrician", "electrical contractor", "electrical services", "electrical works", "mep contractor"],
    spheres: ["property_construction"],
    summary: "Installs and maintains electrical systems for homes, offices and factories.",
    typicalCustomers: ["homeowners", "small and medium businesses", "manufacturers", "real estate developers"],
    typicalProblems: ["new electrical installation", "power issues", "safety audits", "load upgrades"],
    idealReferral: "A business fitting out new premises or a factory adding machines that need more power.",
    triggerWords: ["power trips", "new machines", "fit-out", "safety audit", "load increase"],
    qualificationQuestions: ["Is this a new installation or an upgrade?", "Has there been a recent safety audit?", "What is the timeline?"],
  },
  {
    id: "solar_energy", name: "Solar Energy Solutions", icon: "Sun",
    aliases: ["solar", "solar energy", "solar panels", "rooftop solar", "renewable energy", "solar installer"],
    spheres: ["property_construction"],
    summary: "Designs and installs rooftop and ground-mounted solar systems.",
    typicalCustomers: ["homeowners", "manufacturers", "small and medium businesses", "schools"],
    typicalProblems: ["high electricity bills", "sustainability targets", "power backup"],
    idealReferral: "A factory, school or homeowner with a large electricity bill and their own roof.",
    triggerWords: ["electricity bill is huge", "going green", "ESG targets", "power cuts", "new building"],
    qualificationQuestions: ["What is your monthly electricity bill?", "Do you own the roof?", "Do you have sustainability targets?"],
  },
  {
    id: "it_services", name: "IT Services & Support", icon: "Server",
    aliases: ["it services", "it support", "managed it", "it solutions", "computer services", "network solutions", "cloud services", "it consultant", "erp"],
    spheres: ["technology", "workplace_operations"],
    summary: "Provides managed IT, networks, devices, cloud and business software.",
    typicalCustomers: ["small and medium businesses", "schools", "healthcare providers"],
    typicalProblems: ["unreliable IT", "new office setup", "cloud migration", "software licensing"],
    idealReferral: "A business with 10+ staff that has no dedicated IT person, or is moving offices.",
    triggerWords: ["our systems keep crashing", "moving office", "new employees need laptops", "email problems", "need an ERP"],
    qualificationQuestions: ["Who looks after your IT today?", "How many users and devices do you have?", "Are you moving or opening a new office?"],
  },
  {
    id: "cybersecurity", name: "Cybersecurity Consultant", icon: "Lock",
    aliases: ["cybersecurity", "cyber security", "information security", "data security", "security audit", "penetration testing"],
    spheres: ["technology"],
    summary: "Protects businesses from data breaches, ransomware and compliance failures.",
    typicalCustomers: ["small and medium businesses", "healthcare providers", "financial services", "enterprises"],
    typicalProblems: ["data breaches", "ransomware", "compliance audits", "client security questionnaires"],
    idealReferral: "A business that handles customer data and has a client demanding security compliance, or just had an incident.",
    triggerWords: ["we got hacked", "phishing email", "client sent a security questionnaire", "ISO 27001", "data protection law"],
    qualificationQuestions: ["Do you store customer or patient data?", "Have you had a security incident?", "Do clients ask for security certifications?"],
  },
  {
    id: "printing_branding", name: "Printing & Branding", icon: "Printer",
    aliases: ["printing", "printer", "branding", "signage", "print shop", "brand design", "graphic design", "packaging design"],
    spheres: ["events_branding", "business_growth"],
    summary: "Designs and produces brand identity, printed collateral and signage.",
    typicalCustomers: ["small and medium businesses", "retailers", "event organisers", "schools"],
    typicalProblems: ["inconsistent branding", "new signage", "marketing collateral", "event materials"],
    idealReferral: "A business launching, rebranding, opening a new outlet or exhibiting at a trade show.",
    triggerWords: ["new logo", "opening a store", "trade show", "rebranding", "need brochures"],
    qualificationQuestions: ["Is there a launch, event or opening coming up?", "Do you have brand guidelines?", "What materials do you need and by when?"],
  },
  {
    id: "corporate_gifting", name: "Corporate Gifting", icon: "Gift",
    aliases: ["corporate gifting", "corporate gifts", "gifting", "promotional products", "merchandise", "hampers"],
    spheres: ["events_branding"],
    summary: "Sources branded gifts, festive hampers and employee welcome kits.",
    typicalCustomers: ["enterprises", "small and medium businesses", "event organisers"],
    typicalProblems: ["festive gifting", "employee onboarding kits", "client appreciation", "event giveaways"],
    idealReferral: "An HR or admin head planning festive gifts, onboarding kits or a client-appreciation programme.",
    triggerWords: ["Diwali gifts", "welcome kits", "client appreciation", "annual day", "conference giveaways"],
    qualificationQuestions: ["How many recipients?", "What is the occasion and date?", "What budget per gift?"],
  },
  {
    id: "event_management", name: "Event Management", icon: "CalendarHeart",
    aliases: ["event management", "event planner", "events", "event organiser", "wedding planner", "conference organiser", "exhibition"],
    spheres: ["events_branding"],
    summary: "Plans and runs corporate events, launches, conferences and celebrations.",
    typicalCustomers: ["enterprises", "small and medium businesses", "schools", "nonprofits"],
    typicalProblems: ["product launches", "annual days", "conferences", "dealer meets"],
    idealReferral: "A company planning a launch, annual day, dealer meet or conference in the next six months.",
    triggerWords: ["annual day", "product launch", "dealer meet", "offsite", "anniversary celebration"],
    qualificationQuestions: ["What is the event and the expected headcount?", "Is a date fixed?", "Who is organising it today?"],
  },
  {
    id: "photographer_videographer", name: "Photographer & Videographer", icon: "Camera",
    aliases: ["photographer", "videographer", "photography", "video production", "corporate photography", "product photography", "film production"],
    spheres: ["events_branding", "business_growth"],
    summary: "Produces corporate photos, product shoots, brand films and event coverage.",
    typicalCustomers: ["small and medium businesses", "ecommerce brands", "event organisers", "enterprises"],
    typicalProblems: ["poor product images", "no brand video", "event coverage", "team headshots"],
    idealReferral: "A brand launching products, refreshing its website or holding an event worth documenting.",
    triggerWords: ["new website", "product launch", "need a brand video", "event coming up", "our photos look amateur"],
    qualificationQuestions: ["What will the images or video be used for?", "Is there a launch date?", "Do you have a brand style guide?"],
  },
  {
    id: "financial_planner", name: "Financial Planner / Wealth Advisor", icon: "PiggyBank",
    aliases: ["financial planner", "wealth advisor", "wealth management", "investment advisor", "mutual funds", "financial advisor", "certified financial planner", "portfolio management"],
    spheres: ["finance_wealth"],
    summary: "Plans investments, retirement and succession for individuals and business owners.",
    typicalCustomers: ["high net worth individuals", "professionals", "small and medium businesses"],
    typicalProblems: ["retirement planning", "tax-efficient investing", "succession planning", "surplus business cash"],
    idealReferral: "A business owner or professional with surplus income but no written financial plan.",
    triggerWords: ["sold a business", "bonus", "retirement", "inheritance", "surplus cash"],
    qualificationQuestions: ["Do you have a written financial plan?", "Any major life or business event coming up?", "Who advises you on investments today?"],
  },
  {
    id: "health_insurance", name: "Life & Health Insurance Advisor", icon: "HeartPulse",
    aliases: ["life insurance", "health insurance", "life and health insurance", "term insurance", "medical insurance", "lic agent"],
    spheres: ["finance_wealth"],
    summary: "Protects families and key people with life, term and health cover.",
    typicalCustomers: ["professionals", "homeowners", "high net worth individuals", "small and medium businesses"],
    typicalProblems: ["no term cover", "inadequate health cover", "key-person risk", "loan protection"],
    idealReferral: "Someone who has just taken a home loan, had a child, or started a business with dependants relying on them.",
    triggerWords: ["new baby", "home loan", "got married", "started a business", "parents' health"],
    qualificationQuestions: ["Do you have term cover equal to 10x income?", "Is your family health cover adequate?", "Any loans that would pass to family?"],
  },
  {
    id: "travel_agent", name: "Travel Agency", icon: "Plane",
    aliases: ["travel agent", "travel agency", "tours and travels", "corporate travel", "holiday planner", "tour operator", "mice"],
    spheres: ["events_branding"],
    summary: "Organises corporate travel, incentive trips, offsites and holidays.",
    typicalCustomers: ["enterprises", "small and medium businesses", "professionals", "families"],
    typicalProblems: ["corporate travel management", "incentive trips", "group travel", "visas"],
    idealReferral: "A company planning a team offsite, dealer incentive trip or frequent business travel.",
    triggerWords: ["team offsite", "incentive trip", "conference abroad", "family holiday", "visa"],
    qualificationQuestions: ["How many travellers and when?", "Is this for business or leisure?", "Who books travel today?"],
  },
  {
    id: "business_coach", name: "Business Coach", icon: "Target",
    aliases: ["business coach", "executive coach", "leadership coach", "business consultant", "strategy consultant", "management consultant", "growth coach"],
    spheres: ["business_growth"],
    summary: "Helps owners set strategy, build systems and develop leadership teams.",
    typicalCustomers: ["small and medium businesses", "startups", "family businesses"],
    typicalProblems: ["growth plateau", "owner dependency", "no strategy", "team accountability"],
    idealReferral: "An owner who is the bottleneck in their business and wants to scale without working more hours.",
    triggerWords: ["I'm stuck", "growth has stalled", "can't take a holiday", "team isn't accountable", "succession"],
    qualificationQuestions: ["What would you do with 10 extra hours a week?", "Is revenue growing, flat or falling?", "Who makes decisions when you're away?"],
  },
  {
    id: "sales_trainer", name: "Sales Trainer", icon: "TrendingUp",
    aliases: ["sales trainer", "sales training", "sales consultant", "sales coach", "sales process consultant", "crm consultant"],
    spheres: ["business_growth"],
    summary: "Builds sales processes, trains sales teams and implements CRM discipline.",
    typicalCustomers: ["small and medium businesses", "manufacturers", "professional services firms"],
    typicalProblems: ["low conversion of enquiries", "untrained sales team", "no sales process", "no CRM"],
    idealReferral: "A business that gets enquiries but converts few of them, or is hiring its first sales team.",
    triggerWords: ["leads don't convert", "hiring salespeople", "sales are inconsistent", "we need a CRM", "founder still sells everything"],
    qualificationQuestions: ["What percentage of enquiries become customers?", "Is there a written sales process?", "Who sells today?"],
  },
  {
    id: "commercial_cleaning", name: "Facility Management & Cleaning", icon: "Sparkles",
    aliases: ["cleaning", "commercial cleaning", "facility management", "housekeeping", "pest control", "deep cleaning", "janitorial"],
    spheres: ["workplace_operations", "property_construction"],
    summary: "Provides housekeeping, deep cleaning, pest control and facility management.",
    typicalCustomers: ["small and medium businesses", "property owners", "schools", "healthcare providers"],
    typicalProblems: ["office hygiene", "post-construction cleaning", "facility upkeep"],
    idealReferral: "A business moving into new premises or a property manager unhappy with their current vendor.",
    triggerWords: ["moving office", "construction just finished", "hygiene audit", "vendor not reliable"],
    qualificationQuestions: ["What is the area in square feet?", "Daily service or one-time?", "Who is the current vendor?"],
  },
  {
    id: "logistics", name: "Logistics & Courier", icon: "Truck",
    aliases: ["logistics", "courier", "freight", "transport", "shipping", "warehousing", "packers and movers", "supply chain"],
    spheres: ["workplace_operations"],
    summary: "Moves goods: courier, freight, warehousing and relocation.",
    typicalCustomers: ["manufacturers", "ecommerce brands", "retailers", "small and medium businesses"],
    typicalProblems: ["delivery delays", "high shipping costs", "warehousing", "office relocation"],
    idealReferral: "A manufacturer or online seller shipping regularly, or a company relocating offices.",
    triggerWords: ["shipping costs", "delivery complaints", "moving office", "exporting", "new warehouse"],
    qualificationQuestions: ["How many shipments per month?", "Domestic or international?", "Any upcoming relocation?"],
  },
  {
    id: "caterer", name: "Caterer", icon: "UtensilsCrossed",
    aliases: ["caterer", "catering", "corporate catering", "food services", "banquet"],
    spheres: ["events_branding"],
    summary: "Provides food for corporate events, offices and celebrations.",
    typicalCustomers: ["enterprises", "event organisers", "schools", "families"],
    typicalProblems: ["event catering", "office meals", "celebrations"],
    idealReferral: "An organiser planning an event for 50+ people or an office that needs daily meals.",
    triggerWords: ["event coming up", "office lunch", "celebration", "annual day"],
    qualificationQuestions: ["Headcount and date?", "Veg/non-veg and service style?", "Venue confirmed?"],
  },
  {
    id: "packaging", name: "Packaging Solutions", icon: "Package",
    aliases: ["packaging", "packaging supplier", "corrugated boxes", "packaging manufacturer", "labels"],
    spheres: ["workplace_operations"],
    summary: "Designs and supplies product and shipping packaging.",
    typicalCustomers: ["manufacturers", "ecommerce brands", "retailers"],
    typicalProblems: ["damaged shipments", "packaging costs", "premium unboxing", "labelling compliance"],
    idealReferral: "A product brand launching a SKU or suffering damaged deliveries.",
    triggerWords: ["products get damaged", "new product launch", "packaging is expensive", "rebranding"],
    qualificationQuestions: ["What products and volumes?", "Is damage in transit a problem?", "Is a launch or rebrand planned?"],
  },
];

export const SPHERES: SphereDef[] = [
  {
    id: "business_growth", name: "Business Growth & Advisory",
    description: "Professionals who serve owner-managed and growing businesses: getting customers, managing money, staying compliant and building the team.",
    roles: {
      digital_marketing: "Brings in demand; sees businesses investing in growth before anyone else does.",
      web_development: "Builds the digital storefront that marketing campaigns depend on.",
      chartered_accountant: "Trusted adviser who sees every client's numbers, growth plans and compliance gaps.",
      virtual_cfo: "Turns growth into managed cash flow; spots funding and margin problems early.",
      business_lawyer: "Protects contracts, partnerships and IP as the business grows.",
      hr_consultant: "Builds the people systems a growing business needs after its first hires.",
      business_loan_advisor: "Funds the expansion that the rest of the sphere helps plan.",
      corporate_insurance: "Protects the assets, people and contracts the business is building.",
      business_coach: "Works with the owner on strategy and knows which specialist gaps exist.",
      sales_trainer: "Converts the demand marketing creates into revenue.",
      printing_branding: "Gives the business a consistent identity across every channel.",
      photographer_videographer: "Produces the content marketing and websites need.",
    },
  },
  {
    id: "finance_wealth", name: "Finance, Wealth & Protection",
    description: "Advisers who look after the money of business owners and families: tax, lending, investments and insurance.",
    roles: {
      chartered_accountant: "Sees income, tax and surplus cash; natural hub of the sphere.",
      virtual_cfo: "Manages business cash and funding needs.",
      financial_planner: "Invests surplus income and plans succession.",
      mortgage_broker: "Finances property purchases.",
      business_loan_advisor: "Finances working capital and expansion.",
      health_insurance: "Protects families and key people.",
      corporate_insurance: "Protects business assets and liabilities.",
      business_lawyer: "Handles wills, succession and shareholder agreements.",
    },
  },
  {
    id: "property_construction", name: "Property & Construction",
    description: "Everyone involved when someone buys, builds, leases or renovates a property.",
    roles: {
      residential_real_estate: "First to know when a family is buying or selling a home.",
      commercial_real_estate: "First to know when a business is moving or expanding premises.",
      mortgage_broker: "Finances the purchase; often hears about deals before they close.",
      architect: "Designs the space; recommends contractors and consultants.",
      interior_designer: "Fits out the space after possession.",
      general_contractor: "Builds and renovates; needs architects and specialists.",
      electrical_contractor: "Specialist trade on every build and fit-out.",
      solar_energy: "Adds energy savings to new and existing buildings.",
      commercial_cleaning: "Post-construction cleaning and ongoing facility upkeep.",
    },
  },
  {
    id: "technology", name: "Technology & Digital",
    description: "Providers who digitise, secure and promote a business.",
    roles: {
      it_services: "Runs day-to-day systems and hears about every tech pain point.",
      cybersecurity: "Secures the systems IT and web teams build.",
      web_development: "Builds websites and web applications.",
      digital_marketing: "Drives traffic and leads to the digital assets.",
    },
  },
  {
    id: "events_branding", name: "Events, Branding & Hospitality",
    description: "Suppliers that come together whenever a company launches, celebrates or exhibits.",
    roles: {
      event_management: "Plans the event and chooses the vendors.",
      corporate_gifting: "Supplies giveaways, hampers and welcome kits.",
      printing_branding: "Produces signage, banners and collateral.",
      photographer_videographer: "Documents the event and produces launch content.",
      caterer: "Feeds the guests.",
      travel_agent: "Moves people for offsites, conferences and incentive trips.",
      digital_marketing: "Promotes the launch or event.",
    },
  },
  {
    id: "workplace_operations", name: "Workplace & Operations",
    description: "Suppliers that keep a business's people, premises and supply chain running.",
    roles: {
      hr_consultant: "Sees hiring plans and workforce growth.",
      recruitment: "Fills the roles growth creates.",
      commercial_real_estate: "Finds the space the team will work in.",
      commercial_cleaning: "Maintains the premises.",
      it_services: "Equips every new hire and office.",
      logistics: "Moves goods and offices.",
      packaging: "Protects goods in transit.",
      corporate_insurance: "Covers employees, premises and stock.",
    },
  },
];

export const TRIGGERS: TriggerDef[] = [
  { id: "new_location", situation: "A company is expanding into a new location or branch", spottedBy: ["chartered_accountant", "business_loan_advisor", "virtual_cfo", "recruitment", "hr_consultant", "business_coach", "digital_marketing"], needs: ["commercial_real_estate", "interior_designer", "it_services", "printing_branding", "corporate_insurance", "recruitment", "electrical_contractor", "commercial_cleaning"], words: ["opening a branch", "new location", "expanding to another city", "second outlet"] },
  { id: "office_move", situation: "A business is moving into a new office", spottedBy: ["commercial_real_estate", "it_services", "hr_consultant", "chartered_accountant", "logistics"], needs: ["interior_designer", "it_services", "electrical_contractor", "commercial_cleaning", "logistics", "corporate_insurance", "printing_branding"], words: ["moving office", "lease signed", "new premises", "fit-out"] },
  { id: "first_sales_team", situation: "A business is hiring its first sales team", spottedBy: ["hr_consultant", "recruitment", "business_coach", "digital_marketing", "chartered_accountant"], needs: ["sales_trainer", "recruitment", "hr_consultant", "digital_marketing"], words: ["hiring salespeople", "building a sales team", "founder still does all sales"] },
  { id: "leads_not_converting", situation: "A business gets enquiries but struggles to convert them into customers", spottedBy: ["digital_marketing", "web_development", "business_coach"], needs: ["sales_trainer", "digital_marketing", "web_development"], words: ["leads don't convert", "enquiries go cold", "no follow-up process"] },
  { id: "lead_generation", situation: "A business (often a manufacturer or service firm) is struggling to generate qualified leads", spottedBy: ["chartered_accountant", "virtual_cfo", "business_coach", "sales_trainer", "web_development", "business_loan_advisor", "printing_branding", "photographer_videographer"], needs: ["digital_marketing", "sales_trainer"], words: ["sales are down", "not enough leads", "we rely on word of mouth", "pipeline is empty"] },
  { id: "cash_flow", situation: "A company needs better cash-flow visibility", spottedBy: ["chartered_accountant", "business_loan_advisor", "business_coach", "digital_marketing", "sales_trainer"], needs: ["virtual_cfo", "chartered_accountant", "business_loan_advisor"], words: ["cash is tight", "can't predict cash", "customers pay late", "struggling to pay suppliers"] },
  { id: "funding_round", situation: "A founder is preparing for a funding round", spottedBy: ["chartered_accountant", "business_coach", "digital_marketing", "web_development", "business_lawyer"], needs: ["virtual_cfo", "business_lawyer", "chartered_accountant", "web_development", "photographer_videographer"], words: ["raising funds", "investor meeting", "pitch deck", "term sheet"] },
  { id: "rapid_growth", situation: "A company is growing rapidly and needs new operational systems", spottedBy: ["chartered_accountant", "virtual_cfo", "business_coach", "digital_marketing", "business_loan_advisor"], needs: ["hr_consultant", "it_services", "virtual_cfo", "business_coach", "recruitment", "business_lawyer"], words: ["growing fast", "can't keep up", "systems are breaking", "doubling the team"] },
  { id: "new_company", situation: "Someone is starting a new company", spottedBy: ["business_lawyer", "chartered_accountant", "business_coach", "web_development", "commercial_real_estate", "financial_planner"], needs: ["chartered_accountant", "business_lawyer", "web_development", "digital_marketing", "printing_branding", "corporate_insurance"], words: ["starting a business", "registering a company", "just quit my job to start", "new venture"] },
  { id: "rebrand", situation: "A business is rebranding or launching a new product", spottedBy: ["digital_marketing", "web_development", "printing_branding", "photographer_videographer", "event_management", "business_coach"], needs: ["printing_branding", "web_development", "digital_marketing", "photographer_videographer", "event_management", "packaging", "corporate_gifting"], words: ["new logo", "rebranding", "product launch", "new product line"] },
  { id: "big_contract", situation: "A business is signing a large contract or a new major client", spottedBy: ["chartered_accountant", "virtual_cfo", "business_coach", "sales_trainer", "digital_marketing"], needs: ["business_lawyer", "corporate_insurance", "business_loan_advisor", "recruitment"], words: ["won a big order", "signing a contract", "tender", "client requires insurance"] },
  { id: "unpaid_invoices", situation: "A client is not paying or a commercial dispute has started", spottedBy: ["chartered_accountant", "virtual_cfo", "business_loan_advisor"], needs: ["business_lawyer", "virtual_cfo"], words: ["client isn't paying", "dispute", "legal notice", "outstanding dues"] },
  { id: "hiring_wave", situation: "A business is hiring several people or has crossed 20 employees", spottedBy: ["chartered_accountant", "it_services", "business_coach", "commercial_real_estate", "corporate_insurance", "recruitment"], needs: ["hr_consultant", "recruitment", "corporate_insurance", "it_services", "corporate_gifting"], words: ["hiring a lot", "team is growing", "crossed 20 people", "onboarding new staff"] },
  { id: "attrition", situation: "A company is struggling with staff turnover or employee disputes", spottedBy: ["business_coach", "recruitment", "chartered_accountant"], needs: ["hr_consultant", "business_coach", "business_lawyer"], words: ["people keep leaving", "employee dispute", "morale is low"] },
  { id: "machinery_purchase", situation: "A manufacturer is buying machinery or expanding capacity", spottedBy: ["chartered_accountant", "electrical_contractor", "logistics", "packaging", "solar_energy"], needs: ["business_loan_advisor", "corporate_insurance", "electrical_contractor", "solar_energy", "commercial_real_estate"], words: ["new machines", "expanding the factory", "capacity increase"] },
  { id: "high_power_bills", situation: "A factory, school or home has very high electricity bills", spottedBy: ["electrical_contractor", "chartered_accountant", "architect", "general_contractor"], needs: ["solar_energy", "electrical_contractor"], words: ["electricity bill", "power cost", "ESG", "power cuts"] },
  { id: "home_purchase", situation: "A family is buying a home", spottedBy: ["residential_real_estate", "mortgage_broker", "financial_planner", "chartered_accountant"], needs: ["mortgage_broker", "interior_designer", "health_insurance", "residential_real_estate", "business_lawyer", "logistics"], words: ["buying a flat", "booked a house", "home loan", "possession date"] },
  { id: "home_sale_relocation", situation: "A family is relocating or selling their home", spottedBy: ["financial_planner", "hr_consultant", "recruitment", "chartered_accountant", "interior_designer"], needs: ["residential_real_estate", "logistics", "mortgage_broker"], words: ["relocating", "transferred", "selling our home", "moving cities"] },
  { id: "plot_construction", situation: "Someone owns a plot or is planning a new building", spottedBy: ["residential_real_estate", "commercial_real_estate", "mortgage_broker", "chartered_accountant", "business_loan_advisor"], needs: ["architect", "general_contractor", "electrical_contractor", "solar_energy", "business_loan_advisor"], words: ["bought a plot", "building a house", "new factory building"] },
  { id: "renovation", situation: "A property is being renovated", spottedBy: ["interior_designer", "architect", "residential_real_estate", "commercial_cleaning", "electrical_contractor"], needs: ["general_contractor", "electrical_contractor", "interior_designer", "commercial_cleaning", "architect"], words: ["renovating", "redoing the kitchen", "office refresh", "leakage"] },
  { id: "construction_complete", situation: "Construction or a fit-out has just been completed", spottedBy: ["general_contractor", "architect", "interior_designer", "electrical_contractor"], needs: ["commercial_cleaning", "corporate_insurance", "solar_energy", "it_services", "photographer_videographer"], words: ["handover", "project completed", "possession"] },
  { id: "it_outage", situation: "A business has unreliable systems or a data/security scare", spottedBy: ["it_services", "web_development", "chartered_accountant", "digital_marketing"], needs: ["cybersecurity", "it_services", "corporate_insurance"], words: ["we got hacked", "systems crashed", "phishing", "lost data"] },
  { id: "security_compliance", situation: "A client is demanding security or data-protection compliance", spottedBy: ["it_services", "web_development", "business_lawyer", "chartered_accountant"], needs: ["cybersecurity", "business_lawyer", "it_services"], words: ["security questionnaire", "ISO 27001", "data protection", "audit"] },
  { id: "website_outdated", situation: "A business has an outdated or underperforming website", spottedBy: ["digital_marketing", "photographer_videographer", "printing_branding", "it_services", "business_coach"], needs: ["web_development", "digital_marketing", "photographer_videographer"], words: ["website is old", "site is slow", "website doesn't bring leads"] },
  { id: "ecommerce_launch", situation: "A brand wants to start selling online", spottedBy: ["digital_marketing", "chartered_accountant", "logistics", "packaging", "photographer_videographer"], needs: ["web_development", "digital_marketing", "logistics", "packaging", "photographer_videographer"], words: ["sell online", "D2C", "marketplace", "online store"] },
  { id: "corporate_event", situation: "A company is planning a launch, annual day, conference or dealer meet", spottedBy: ["hr_consultant", "digital_marketing", "corporate_gifting", "printing_branding", "photographer_videographer", "travel_agent"], needs: ["event_management", "caterer", "corporate_gifting", "printing_branding", "photographer_videographer", "travel_agent"], words: ["annual day", "launch event", "dealer meet", "conference", "offsite"] },
  { id: "festive_gifting", situation: "A company is planning festive or client-appreciation gifts", spottedBy: ["hr_consultant", "event_management", "chartered_accountant", "printing_branding"], needs: ["corporate_gifting", "printing_branding"], words: ["Diwali gifts", "year-end gifts", "client appreciation"] },
  { id: "team_offsite", situation: "A company is planning a team offsite or incentive trip", spottedBy: ["hr_consultant", "event_management", "business_coach", "sales_trainer"], needs: ["travel_agent", "event_management", "photographer_videographer", "corporate_gifting"], words: ["offsite", "incentive trip", "team outing"] },
  { id: "liquidity_event", situation: "An owner has sold a business, received a large bonus or has surplus cash", spottedBy: ["chartered_accountant", "business_lawyer", "virtual_cfo", "business_coach"], needs: ["financial_planner", "chartered_accountant", "business_lawyer"], words: ["sold the company", "big bonus", "surplus cash", "inheritance"] },
  { id: "life_event", situation: "A family event: marriage, a new child, a home loan or a new business", spottedBy: ["mortgage_broker", "residential_real_estate", "financial_planner", "chartered_accountant", "interior_designer", "event_management"], needs: ["health_insurance", "financial_planner", "business_lawyer"], words: ["new baby", "getting married", "took a home loan", "started a business"] },
  { id: "succession", situation: "An owner is planning succession or bringing the next generation into the business", spottedBy: ["chartered_accountant", "financial_planner", "business_coach"], needs: ["business_lawyer", "financial_planner", "business_coach", "health_insurance"], words: ["next generation", "succession", "retiring", "handing over"] },
  { id: "asset_risk", situation: "A business has new assets, premises or contracts that need protection", spottedBy: ["business_loan_advisor", "commercial_real_estate", "chartered_accountant", "general_contractor", "logistics", "it_services"], needs: ["corporate_insurance", "business_lawyer"], words: ["new machinery", "new premises", "high-value stock", "contract needs insurance"] },
  { id: "loan_rejected", situation: "A business has had a loan rejected or needs working capital", spottedBy: ["chartered_accountant", "virtual_cfo", "business_coach", "commercial_real_estate", "sales_trainer"], needs: ["business_loan_advisor", "virtual_cfo", "chartered_accountant"], words: ["bank said no", "working capital", "need funds", "credit line"] },
  { id: "shipping_problems", situation: "A seller has shipping delays, damage or high logistics costs", spottedBy: ["digital_marketing", "web_development", "chartered_accountant", "packaging"], needs: ["logistics", "packaging"], words: ["delivery delays", "damaged in transit", "shipping is expensive"] },
  { id: "owner_bottleneck", situation: "An owner is the bottleneck and growth has plateaued", spottedBy: ["chartered_accountant", "virtual_cfo", "digital_marketing", "hr_consultant", "sales_trainer", "financial_planner"], needs: ["business_coach", "sales_trainer", "hr_consultant", "virtual_cfo"], words: ["I'm stuck", "growth has stalled", "can't take a holiday", "everything depends on me"] },
];

export const COLLABORATIONS: CollaborationDef[] = [
  { a: "digital_marketing", b: "web_development", idea: "Package a 'website + 90-day lead generation' launch offer with a shared case study." },
  { a: "digital_marketing", b: "chartered_accountant", idea: "Co-host a 'Growth & Compliance' breakfast for owners of businesses that are scaling." },
  { a: "digital_marketing", b: "sales_trainer", idea: "Offer a combined 'leads to revenue' programme: marketing fills the pipeline, sales training converts it." },
  { a: "digital_marketing", b: "photographer_videographer", idea: "Bundle content shoots with campaign management for product launches." },
  { a: "digital_marketing", b: "printing_branding", idea: "Run joint rebrand projects covering online and offline brand assets." },
  { a: "chartered_accountant", b: "virtual_cfo", idea: "Agree a clear split: compliance stays with the CA, monthly MIS and cash-flow forecasting go to the CFO." },
  { a: "chartered_accountant", b: "business_lawyer", idea: "Offer a 'company set-up' bundle: incorporation, agreements, tax registration." },
  { a: "chartered_accountant", b: "financial_planner", idea: "Run a year-end tax and investment planning review for mutual clients." },
  { a: "chartered_accountant", b: "business_loan_advisor", idea: "Prepare loan-ready financial packs together for clients seeking funding." },
  { a: "virtual_cfo", b: "business_loan_advisor", idea: "Build a funding-readiness programme: forecasts from the CFO, lender matching from the advisor." },
  { a: "virtual_cfo", b: "business_lawyer", idea: "Support founders through fundraising: data room, valuation model and investment agreements." },
  { a: "hr_consultant", b: "recruitment", idea: "Offer 'hire and onboard': recruitment fills roles, HR builds policies and onboarding." },
  { a: "hr_consultant", b: "corporate_insurance", idea: "Present group health and HR policy as a single employee-benefits review." },
  { a: "hr_consultant", b: "corporate_gifting", idea: "Design employee welcome kits and recognition programmes together." },
  { a: "architect", b: "interior_designer", idea: "Offer design-to-handover projects with one point of contact." },
  { a: "architect", b: "general_contractor", idea: "Bid jointly on design-and-build projects." },
  { a: "general_contractor", b: "electrical_contractor", idea: "Bundle civil and electrical works into one quote for renovations." },
  { a: "residential_real_estate", b: "mortgage_broker", idea: "Run first-time home-buyer workshops together." },
  { a: "residential_real_estate", b: "interior_designer", idea: "Offer buyers a move-in-ready package at closing." },
  { a: "commercial_real_estate", b: "interior_designer", idea: "Pitch 'plug-and-play' offices to tenants: space plus fit-out." },
  { a: "commercial_real_estate", b: "it_services", idea: "Provide move-in IT readiness for every new commercial tenant." },
  { a: "electrical_contractor", b: "solar_energy", idea: "Offer solar plus electrical-upgrade packages to factories." },
  { a: "it_services", b: "cybersecurity", idea: "Bundle managed IT with an annual security assessment." },
  { a: "web_development", b: "cybersecurity", idea: "Add a security hardening and compliance check to every website build." },
  { a: "event_management", b: "caterer", idea: "Offer all-inclusive corporate event packages." },
  { a: "event_management", b: "photographer_videographer", idea: "Include event coverage and highlight videos as standard." },
  { a: "event_management", b: "corporate_gifting", idea: "Supply branded giveaways and delegate kits for every event." },
  { a: "event_management", b: "travel_agent", idea: "Package destination offsites and conferences." },
  { a: "financial_planner", b: "health_insurance", idea: "Run combined protection-and-investment reviews for families." },
  { a: "logistics", b: "packaging", idea: "Offer damage-free shipping programmes for e-commerce brands." },
  { a: "business_coach", b: "sales_trainer", idea: "Run a strategy-plus-execution programme for owner-managed businesses." },
  { a: "business_coach", b: "virtual_cfo", idea: "Pair strategy sessions with financial dashboards so owners can measure progress." },
];

// ---- lookups ---------------------------------------------------------------

const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));
const sphereById = new Map(SPHERES.map((s) => [s.id, s]));

export function getCategory(id: string | null | undefined): CategoryDef | undefined {
  return id ? categoryById.get(id) : undefined;
}

export function getSphere(id: string): SphereDef | undefined {
  return sphereById.get(id);
}

/** Map free text such as "Chartered Accountant (Tax)" to a taxonomy category id. */
export function matchCategory(text: string | null | undefined): string | null {
  if (!text) return null;
  const c = clean(text);
  if (categoryById.has(c.replace(/\s+/g, "_"))) return c.replace(/\s+/g, "_");
  let best: { id: string; len: number } | null = null;
  for (const cat of CATEGORIES) {
    for (const alias of [cat.name.toLowerCase(), ...cat.aliases]) {
      const a = clean(alias);
      const hit = c === a || new RegExp(`(^|\\s)${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(c);
      if (hit && (!best || a.length > best.len)) best = { id: cat.id, len: a.length };
    }
  }
  return best?.id ?? null;
}

export function sharedSpheres(a: string | null | undefined, b: string | null | undefined): string[] {
  const ca = getCategory(a);
  const cb = getCategory(b);
  if (!ca || !cb) return [];
  return ca.spheres.filter((s) => cb.spheres.includes(s));
}

/** Spheres of A and B are different but share at least one other category. */
export function adjacentSpheres(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = getCategory(a);
  const cb = getCategory(b);
  if (!ca || !cb) return false;
  for (const sa of ca.spheres) {
    const ra = Object.keys(getSphere(sa)?.roles ?? {});
    for (const sb of cb.spheres) {
      const rb = Object.keys(getSphere(sb)?.roles ?? {});
      if (ra.some((x) => rb.includes(x))) return true;
    }
  }
  return false;
}

/** Triggers in which a member of category `giver` would spot a need for category `receiver`. */
export function triggersBetween(giver: string | null | undefined, receiver: string | null | undefined): TriggerDef[] {
  if (!giver || !receiver || giver === receiver) return [];
  return TRIGGERS.filter((t) => t.spottedBy.includes(giver) && t.needs.includes(receiver));
}

export function collaborationFor(a: string | null | undefined, b: string | null | undefined): CollaborationDef | undefined {
  if (!a || !b) return undefined;
  return COLLABORATIONS.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
}
