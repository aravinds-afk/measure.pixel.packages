import type { DiscoveryResult } from "@/server/discovery/analyze";

export type Status = "working_well" | "needs_improvement" | "missing" | "not_applicable" | "not_assessed";

export type Response = {
  status: Status;
  notes?: string;
  evidence?: string;
  source?: "auto-verified" | "consultant";
  confirmedByClient?: boolean;
  suggestion?: { status: string; note: string; evidence?: string } | null;
};

export type CustomItem = { id: string; categoryId: string; label: string; priority: "high" | "medium" | "low"; serviceIds: string[] };

export type AuditState = {
  id: string;
  rev: number;
  status: "draft" | "completed";
  industryId: string | null;
  goals: string[];
  goalNotes: string;
  painOfferIds: string[];
  budgetMonthly: number | null;
  readiness: "now" | "next-quarter" | "exploring" | null;
  responses: Record<string, Response>;
  customItems: CustomItem[];
  consultantNotes: string;
  discovery: DiscoveryResult | null;
  createdAt: string;
};

export type ClientState = {
  id: string;
  businessName: string;
  website: string;
  contactPerson: string;
  phone: string;
  email: string;
  instagram: string;
  linkedin: string;
  youtube: string;
};

export type Ref = {
  categories: { id: string; name: string }[];
  items: { id: string; categoryId: string; label: string; help: string; priority: "high" | "medium" | "low"; serviceIds: string[] }[];
  industries: { id: string; name: string; clusterId: string }[];
  clusters: { id: string; name: string }[];
  offers: { id: string; number: number; name: string; buyerQuote: string; clusterId: string | null; audienceLabel: string }[];
  services: { id: string; name: string; linkId: string }[];
  links: { id: string; name: string }[];
  goals: { id: string; label: string }[];
};

export const STATUS_OPTIONS: { value: Status; label: string; short: string; tone: string }[] = [
  { value: "working_well", label: "Working Well", short: "Working", tone: "bg-ok text-white border-ok" },
  { value: "needs_improvement", label: "Needs Improvement", short: "Improve", tone: "bg-warn text-white border-warn" },
  { value: "missing", label: "Missing", short: "Missing", tone: "bg-danger text-white border-danger" },
  { value: "not_applicable", label: "Not Applicable", short: "N/A", tone: "bg-ink-2 text-white border-ink-2" },
  { value: "not_assessed", label: "Not Assessed", short: "Not assessed", tone: "bg-surface-2 text-ink border-border-strong" },
];

export const statusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
