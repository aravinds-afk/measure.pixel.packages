import { MODULE_ROUTE_PREFIX, type ModuleKey } from "@/lib/rbac";

export const MODULE_ALIASES: Record<string, ModuleKey> = {
  dashboard: "dashboard", home: "dashboard",
  customer: "customers", customers: "customers",
  lead: "leads", leads: "leads",
  deal: "deals", deals: "deals", pipeline: "deals",
  employee: "employees", employees: "employees", team: "team",
  task: "tasks", tasks: "tasks",
  followup: "followups", "follow-up": "followups", "follow up": "followups", followups: "followups",
  calendar: "calendar",
  call: "calls", calls: "calls",
  email: "emails", emails: "emails",
  notification: "notifications", notifications: "notifications",
  invoice: "invoices", invoices: "invoices",
  payment: "payments", payments: "payments",
  report: "reports", reports: "reports",
  document: "documents", documents: "documents",
  marketing: "marketing",
  activity: "activity",
  settings: "settings",
  profile: "profile",
};

const NAV_PREFIX = /^(open|show|go to|navigate to|take me to)\b/;

export function findModule(text: string): ModuleKey | null {
  for (const [alias, key] of Object.entries(MODULE_ALIASES)) {
    if (text.includes(alias)) return key;
  }
  return null;
}

/** Resolves a "open/show/go to X" command entirely client-side, no server round trip needed. */
export function parseNavigationCommand(rawText: string): { moduleKey: ModuleKey; href: string } | null {
  const text = rawText.trim().toLowerCase();
  if (!NAV_PREFIX.test(text)) return null;
  const moduleKey = findModule(text);
  if (!moduleKey) return null;
  return { moduleKey, href: MODULE_ROUTE_PREFIX[moduleKey] };
}
