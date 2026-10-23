// FICTIONAL DEMO DATASET. Every person and company here is invented for demonstration.
// It lives in its own chapter flagged is_demo = true and must never be mixed with imported records.

import type { MemberProfile, Provenance } from "./engine/types.ts";

export const DEMO_CHAPTER_ID = "00000000-0000-4000-8000-00000000d001";
export const DEMO_CHAPTER = {
  id: DEMO_CHAPTER_ID,
  name: "Demo Chapter (Fictional Data)",
  region: "Demo Region",
  isDemo: true,
};

type Seed = Omit<MemberProfile, "chapterId" | "isDemo" | "status" | "relationships" | "sphereIds" | "fieldProvenance" | "source" | "profileUpdatedAt"> &
  Partial<Pick<MemberProfile, "relationships" | "sphereIds" | "status">> & { email?: string; phone?: string; contactVisibility?: "chapter" | "private" };

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const DEMO_IDS = {
  priya: id(1), arjun: id(2), kavya: id(3), rohan: id(4), rahul: id(5), sneha: id(6), vikram: id(7), ananya: id(8),
  farhan: id(9), meera: id(10), daniel: id(11), lakshmi: id(12), karthik: id(13), nisha: id(14), suresh: id(15), tara: id(16), imran: id(17),
};

const seeds: Seed[] = [
  {
    id: DEMO_IDS.priya, externalId: "DEMO-001", fullName: "Priya Raman", company: "BrightFunnel Digital (fictional)", categoryId: "digital_marketing", categoryLabel: "Digital Marketing Consultant",
    businessDescription: "Performance marketing studio that builds predictable lead-generation systems for B2B service firms and manufacturers.",
    services: ["SEO", "Google and Meta ads", "Marketing automation", "Landing pages", "Lead nurturing"],
    customerSegments: ["Small and medium businesses", "Manufacturers", "Professional services firms"],
    companySizes: ["11-50", "51-250"], industries: ["Manufacturing", "Professional services", "Healthcare"],
    serviceAreas: ["Chennai", "Online"], problemsSolved: ["Not enough qualified leads", "Low website conversion", "No follow-up system for enquiries"],
    keywords: ["lead generation", "B2B marketing", "Google ads"], icpDescription: "Owner-managed B2B firms with 20–200 staff that sell high-value services or industrial products.",
    idealReferral: "Owner of a 20–200 person manufacturer or B2B service firm that relies on word of mouth and wants predictable enquiries.",
    website: "https://example.com/brightfunnel", photoUrl: null,
    relationships: [{ memberId: id(4), kind: "referral_partner", provenance: "member_submitted" }], email: "priya@example.com", phone: "+910000000001",
  },
  {
    id: DEMO_IDS.arjun, externalId: "DEMO-002", fullName: "Arjun Mehta", company: "Mehta & Associates CA (fictional)", categoryId: "chartered_accountant", categoryLabel: "Chartered Accountant",
    businessDescription: "Audit, tax and GST practice for owner-managed companies.",
    services: ["Statutory audit", "GST filings", "Tax planning", "Company incorporation", "Bookkeeping"],
    customerSegments: ["SMEs", "Manufacturers", "Professional services firms", "Startups"], companySizes: ["11-50", "51-250"],
    industries: ["Manufacturing", "Professional services", "Healthcare"], serviceAreas: ["Chennai"],
    problemsSolved: ["Tax compliance", "GST filings", "Messy books", "Profit and growth planning"],
    keywords: ["GST", "audit", "income tax"], icpDescription: "Owner-managed manufacturers and B2B service firms with 20–200 staff and turnover above ₹5 crore.",
    idealReferral: "A growing manufacturer whose books are handled by a part-time bookkeeper and who is planning to raise a bank loan.",
    website: "https://example.com/mehta-ca", photoUrl: null, email: "arjun@example.com", phone: "+910000000002",
  },
  {
    id: DEMO_IDS.kavya, externalId: "DEMO-003", fullName: "Kavya Iyer", company: "ClearLedger CFO (fictional)", categoryId: "virtual_cfo", categoryLabel: "Virtual CFO",
    businessDescription: "Part-time CFO team providing cash-flow forecasting, MIS and fundraising support.",
    services: ["Cash-flow forecasting", "Monthly MIS", "Fundraising support", "Budgeting"],
    customerSegments: ["Startups", "Small and medium businesses"], companySizes: ["11-50"],
    industries: ["Technology", "Manufacturing"], serviceAreas: ["Chennai", "Bengaluru"],
    problemsSolved: ["Poor cash-flow visibility", "Fundraising preparation", "No monthly MIS"],
    keywords: ["virtual CFO", "cash flow", "fundraising"], website: "https://example.com/clearledger", photoUrl: null,
  },
  {
    id: DEMO_IDS.rohan, externalId: "DEMO-004", fullName: "Rohan Das", company: "PixelForge Studio (fictional)", categoryId: "web_development", categoryLabel: "Website Development Company",
    businessDescription: "Designs fast, conversion-focused websites and e-commerce stores.",
    services: ["Website design", "E-commerce stores", "Web applications", "Website maintenance"],
    customerSegments: ["Small and medium businesses", "Startups", "Ecommerce brands"], companySizes: ["1-10", "11-50"],
    industries: ["Retail", "Professional services", "Technology"], serviceAreas: ["Online"],
    problemsSolved: ["Outdated website", "Slow website", "No online ordering"],
    keywords: ["website", "Shopify", "WordPress"], website: "https://example.com/pixelforge", photoUrl: null,
    relationships: [{ memberId: id(1), kind: "referral_partner", provenance: "member_submitted" }],
  },
  {
    id: DEMO_IDS.rahul, externalId: "DEMO-005", fullName: "Rahul Verma", company: "CodeCraft Web Solutions (fictional)", categoryId: "web_development", categoryLabel: "Web Developer",
    businessDescription: "Website design and e-commerce development for small businesses.",
    services: ["Website design", "E-commerce stores", "Website maintenance"],
    customerSegments: ["Small and medium businesses", "Retailers"], companySizes: ["1-10", "11-50"],
    industries: ["Retail"], serviceAreas: ["Chennai"], problemsSolved: ["Outdated website", "No online ordering"],
    keywords: ["website", "WordPress"], photoUrl: null,
  },
  {
    id: DEMO_IDS.sneha, externalId: "DEMO-006", fullName: "Sneha Kulkarni", company: "Kulkarni Homes Realty (fictional)", categoryId: "residential_real_estate", categoryLabel: "Residential Real Estate Agent",
    businessDescription: "Helps families buy, sell and rent apartments and villas.",
    services: ["Home buying", "Home selling", "Rental management"], customerSegments: ["Home buyers", "Homeowners", "Professionals"],
    companySizes: ["Individuals"], industries: ["Real estate"], serviceAreas: ["Chennai"],
    problemsSolved: ["Finding the right home", "Selling a property", "Relocation"], keywords: ["apartments", "villas", "relocation"],
    idealReferral: "A family relocating to Chennai or upgrading to a bigger home within six months.", photoUrl: null, email: "sneha@example.com",
  },
  {
    id: DEMO_IDS.vikram, externalId: "DEMO-007", fullName: "Vikram Nair", company: "HomeFirst Loan Advisors (fictional)", categoryId: "mortgage_broker", categoryLabel: "Home Loan Advisor",
    businessDescription: "Arranges home loans and balance transfers across 15 lenders.",
    services: ["Home loans", "Balance transfer", "Loan against property"], customerSegments: ["Home buyers", "Professionals", "Homeowners"],
    companySizes: ["Individuals"], industries: ["Real estate", "Financial services"], serviceAreas: ["Chennai"],
    problemsSolved: ["Loan eligibility", "High interest rates", "Loan rejections"], keywords: ["home loan", "EMI"], photoUrl: null,
  },
  {
    id: DEMO_IDS.ananya, externalId: "DEMO-008", fullName: "Ananya Bose", company: "Studio Ananya Interiors (fictional)", categoryId: "interior_designer", categoryLabel: "Interior Designer",
    businessDescription: "Turnkey home and office interiors.",
    services: ["Home interiors", "Office fit-outs", "Modular kitchens"], customerSegments: ["Homeowners", "Home buyers", "Small and medium businesses"],
    companySizes: ["Individuals", "11-50"], industries: ["Real estate"], serviceAreas: ["Chennai"],
    problemsSolved: ["New home setup", "Office fit-out", "Renovation"], keywords: ["interiors", "modular kitchen"], photoUrl: null,
  },
  {
    id: DEMO_IDS.farhan, externalId: "DEMO-009", fullName: "Farhan Sheikh", company: "SafeHarbour Insurance Advisory (fictional)", categoryId: "corporate_insurance", categoryLabel: "Corporate Insurance Advisor",
    businessDescription: "Commercial insurance and group health for growing companies.",
    services: ["Fire and property insurance", "Group health insurance", "Liability insurance", "Marine insurance"],
    customerSegments: ["Small and medium businesses", "Manufacturers"], companySizes: ["11-50", "51-250"],
    industries: ["Manufacturing", "Logistics", "Retail"], serviceAreas: ["Chennai", "Coimbatore"],
    problemsSolved: ["Under-insured assets", "Group health for employees", "Claims rejected"], keywords: ["insurance", "group health"], photoUrl: null,
  },
  {
    id: DEMO_IDS.meera, externalId: "DEMO-010", fullName: "Meera Pillai", company: "PeopleFirst HR (fictional)", categoryId: "hr_consultant", categoryLabel: "HR Consultant",
    businessDescription: "HR policies, payroll and performance systems for companies with 20–250 staff.",
    services: ["HR policies", "Payroll outsourcing", "Performance management", "Labour law compliance"],
    customerSegments: ["Small and medium businesses", "Startups"], companySizes: ["11-50", "51-250"],
    industries: ["Technology", "Manufacturing", "Healthcare"], serviceAreas: ["Chennai", "Online"],
    problemsSolved: ["No HR policies", "High attrition", "Payroll compliance"], keywords: ["HR", "payroll", "POSH"], photoUrl: null,
  },
  {
    id: DEMO_IDS.daniel, externalId: "DEMO-011", fullName: "Daniel Joseph", company: "NetSure IT Services (fictional)", categoryId: "it_services", categoryLabel: "IT Services & Support",
    businessDescription: "Managed IT, networks and Microsoft 365 for offices, schools and clinics.",
    services: ["Managed IT support", "Network setup", "Microsoft 365", "Laptops and devices"],
    customerSegments: ["Small and medium businesses", "Schools", "Clinics"], companySizes: ["11-50", "51-250"],
    industries: ["Healthcare", "Education", "Professional services"], serviceAreas: ["Chennai"],
    problemsSolved: ["Unreliable IT", "New office setup", "Email problems"], keywords: ["IT support", "networking"], photoUrl: null,
  },
  {
    id: DEMO_IDS.lakshmi, externalId: "DEMO-012", fullName: "Lakshmi Sundaram", company: "Utsav Corporate Events (fictional)", categoryId: "event_management", categoryLabel: "Event Management",
    businessDescription: "Corporate events, product launches and dealer meets.",
    services: ["Product launches", "Annual days", "Dealer meets", "Conferences"], customerSegments: ["Enterprises", "Small and medium businesses"],
    companySizes: ["51-250", "250+"], industries: ["Manufacturing", "Technology", "Healthcare"], serviceAreas: ["Chennai", "Bengaluru"],
    problemsSolved: ["Product launches", "Annual days", "Dealer meets"], keywords: ["events", "launch"], photoUrl: null,
  },
  {
    id: DEMO_IDS.karthik, externalId: "DEMO-013", fullName: "Karthik Rao", company: "GiftCraft Corporate Gifting (fictional)", categoryId: "corporate_gifting", categoryLabel: "Corporate Gifting",
    businessDescription: "Branded gifts, festive hampers and employee welcome kits.",
    services: ["Festive hampers", "Employee welcome kits", "Branded merchandise"], customerSegments: ["Enterprises", "Small and medium businesses"],
    companySizes: ["51-250", "250+"], industries: ["Technology", "Manufacturing"], serviceAreas: ["Pan India"],
    problemsSolved: ["Festive gifting", "Employee onboarding kits", "Client appreciation"], keywords: ["gifting", "hampers"], photoUrl: null,
  },
  {
    id: DEMO_IDS.nisha, externalId: "DEMO-014", fullName: "Nisha Agarwal", company: "CloseRight Sales Academy (fictional)", categoryId: "sales_trainer", categoryLabel: "Sales Trainer",
    businessDescription: "Sales process design, CRM adoption and sales-team training.",
    services: ["Sales process design", "Sales team training", "CRM implementation"], customerSegments: ["Small and medium businesses", "Manufacturers"],
    companySizes: ["11-50", "51-250"], industries: ["Manufacturing", "Professional services"], serviceAreas: ["Chennai", "Online"],
    problemsSolved: ["Low conversion of enquiries", "Untrained sales team", "No CRM"], keywords: ["sales training", "CRM"], photoUrl: null,
  },
  {
    id: DEMO_IDS.suresh, externalId: "DEMO-015", fullName: "Suresh Menon", company: "Menon Electricals (fictional)", categoryId: "electrical_contractor", categoryLabel: "Electrical Contractor",
    businessDescription: "Electrical installation and maintenance for homes and factories.",
    services: ["Electrical installation", "Factory wiring", "Safety audits"], customerSegments: ["Homeowners", "Manufacturers"],
    companySizes: ["Individuals", "51-250"], industries: ["Manufacturing", "Construction"], serviceAreas: ["Chennai"],
    problemsSolved: ["Power issues", "New electrical installation", "Safety audits"], keywords: ["electrician", "wiring"], photoUrl: null,
  },
  // Deliberately sparse profiles to demonstrate low-confidence results.
  {
    id: DEMO_IDS.tara, externalId: "DEMO-016", fullName: "Tara Wilson", company: "Wanderlust Travel Co. (fictional)", categoryId: "travel_agent", categoryLabel: "Travel Agency",
    businessDescription: null, services: [], customerSegments: [], companySizes: [], industries: [], serviceAreas: [], problemsSolved: [], keywords: [], photoUrl: null,
  },
  {
    id: DEMO_IDS.imran, externalId: "DEMO-017", fullName: "Imran Qureshi", company: "Vaidya Wellness (fictional)", categoryId: null, categoryLabel: "Ayurvedic Wellness Clinic",
    businessDescription: "Wellness clinic.", services: ["Wellness consultations"], customerSegments: [], companySizes: [], industries: [], serviceAreas: ["Chennai"], problemsSolved: [], keywords: [], photoUrl: null,
  },
];

const VERIFIED: Provenance = "verified";

export const DEMO_MEMBERS: (MemberProfile & { email?: string; phone?: string; contactVisibility: "chapter" | "private" })[] = seeds.map((s) => ({
  ...s,
  chapterId: DEMO_CHAPTER_ID,
  isDemo: true,
  status: s.status ?? "active",
  relationships: s.relationships ?? [],
  sphereIds: s.sphereIds ?? [],
  source: "demo_seed",
  profileUpdatedAt: "2026-09-01T00:00:00.000Z",
  fieldProvenance: { categoryId: VERIFIED, fullName: VERIFIED, company: VERIFIED },
  contactVisibility: s.contactVisibility ?? "chapter",
}));

/** Recorded referral history for the demo chapter (fictional). */
export const DEMO_REFERRALS = [
  { giverId: DEMO_IDS.sneha, receiverId: DEMO_IDS.vikram, status: "business_closed", description: "Family buying a 3BHK needed a home loan", value: 0 },
  { giverId: DEMO_IDS.sneha, receiverId: DEMO_IDS.vikram, status: "business_closed", description: "Relocating professional needed loan pre-approval", value: 0 },
  { giverId: DEMO_IDS.sneha, receiverId: DEMO_IDS.vikram, status: "introduction_made", description: "Couple comparing lenders", value: null },
  { giverId: DEMO_IDS.vikram, receiverId: DEMO_IDS.sneha, status: "referral_accepted", description: "Loan client looking to sell their old flat", value: null },
  { giverId: DEMO_IDS.vikram, receiverId: DEMO_IDS.sneha, status: "business_meeting_completed", description: "Pre-approved buyer looking for a villa", value: null },
  { giverId: DEMO_IDS.arjun, receiverId: DEMO_IDS.kavya, status: "introduction_made", description: "Audit client preparing for a funding round", value: null },
] as const;

/** Demo login personas. */
export const DEMO_USERS = [
  { userId: "demo-user-admin", email: "admin@demo.invalid", role: "admin" as const, memberId: DEMO_IDS.arjun, label: "Arjun Mehta — Chapter Admin" },
  { userId: "demo-user-leader", email: "leader@demo.invalid", role: "leadership" as const, memberId: DEMO_IDS.lakshmi, label: "Lakshmi Sundaram — Leadership Team" },
  { userId: "demo-user-member", email: "member@demo.invalid", role: "member" as const, memberId: DEMO_IDS.priya, label: "Priya Raman — Chapter Member" },
];
