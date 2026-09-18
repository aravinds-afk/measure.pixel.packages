import type { Role } from "@prisma/client";

export const ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "SALES_EXECUTIVE",
  "EMPLOYEE",
  "CUSTOMER",
];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  SALES_EXECUTIVE: "Sales Executive",
  EMPLOYEE: "Employee",
  CUSTOMER: "Customer",
};

export type ModuleKey =
  | "dashboard"
  | "customers"
  | "leads"
  | "deals"
  | "employees"
  | "tasks"
  | "followups"
  | "calendar"
  | "calls"
  | "emails"
  | "notifications"
  | "invoices"
  | "payments"
  | "reports"
  | "documents"
  | "marketing"
  | "team"
  | "activity"
  | "settings"
  | "profile"
  | "portal";

const ALL: ModuleKey[] = [
  "dashboard", "customers", "leads", "deals", "employees", "tasks", "followups",
  "calendar", "calls", "emails", "notifications", "invoices", "payments", "reports",
  "documents", "marketing", "team", "activity", "settings", "profile",
];

export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: [
    "dashboard", "customers", "leads", "deals", "employees", "tasks", "reports",
    "calendar", "invoices", "payments", "documents", "notifications", "settings", "profile",
    "followups", "calls", "emails", "marketing",
  ],
  MANAGER: [
    "dashboard", "customers", "leads", "deals", "tasks", "followups", "calendar",
    "reports", "team", "notifications", "profile", "calls", "emails", "documents",
  ],
  SALES_EXECUTIVE: [
    "dashboard", "leads", "customers", "deals", "calls", "followups", "tasks",
    "calendar", "reports", "notifications", "profile", "emails",
  ],
  EMPLOYEE: [
    "dashboard", "customers", "tasks", "calendar", "followups", "documents",
    "notifications", "profile",
  ],
  CUSTOMER: ["portal", "profile", "notifications"],
};

export function canAccess(role: Role, moduleKey: ModuleKey): boolean {
  return ROLE_MODULES[role]?.includes(moduleKey) ?? false;
}

export function homeForRole(role: Role): string {
  if (role === "CUSTOMER") return "/portal";
  return "/dashboard";
}

export const MODULE_ROUTE_PREFIX: Record<ModuleKey, string> = {
  dashboard: "/dashboard",
  customers: "/customers",
  leads: "/leads",
  deals: "/deals",
  employees: "/employees",
  tasks: "/tasks",
  followups: "/followups",
  calendar: "/calendar",
  calls: "/calls",
  emails: "/emails",
  notifications: "/notifications",
  invoices: "/invoices",
  payments: "/payments",
  reports: "/reports",
  documents: "/documents",
  marketing: "/marketing",
  team: "/team",
  activity: "/activity",
  settings: "/settings",
  profile: "/profile",
  portal: "/portal",
};
