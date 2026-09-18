import {
  LayoutDashboard, Users, Target, Handshake, GitBranch, Phone, Mail, CheckSquare,
  Calendar, FileText, Receipt, Wallet, Megaphone, BarChart3, UserCog, Users2,
  ScrollText, Settings, Bell, ClipboardList,
} from "lucide-react";
import type { ModuleKey } from "@/lib/rbac";

export type NavItem = { key: ModuleKey; label: string; href: string; icon: typeof LayoutDashboard };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [{ key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "CRM",
    items: [
      { key: "customers", label: "Customers", href: "/customers", icon: Users },
      { key: "leads", label: "Leads", href: "/leads", icon: Target },
      { key: "deals", label: "Deals", href: "/deals", icon: Handshake },
    ],
  },
  {
    label: "Sales",
    items: [
      { key: "deals", label: "Pipeline", href: "/pipeline", icon: GitBranch },
      { key: "followups", label: "Follow-ups", href: "/followups", icon: ClipboardList },
      { key: "calls", label: "Calls", href: "/calls", icon: Phone },
      { key: "emails", label: "Emails", href: "/emails", icon: Mail },
    ],
  },
  {
    label: "Productivity",
    items: [
      { key: "tasks", label: "Tasks", href: "/tasks", icon: CheckSquare },
      { key: "calendar", label: "Calendar", href: "/calendar", icon: Calendar },
      { key: "documents", label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "Finance",
    items: [
      { key: "invoices", label: "Invoices", href: "/invoices", icon: Receipt },
      { key: "payments", label: "Payments", href: "/payments", icon: Wallet },
    ],
  },
  {
    label: "Marketing",
    items: [{ key: "marketing", label: "Campaigns", href: "/marketing", icon: Megaphone }],
  },
  {
    label: "Analytics",
    items: [{ key: "reports", label: "Reports", href: "/reports", icon: BarChart3 }],
  },
  {
    label: "Team",
    items: [
      { key: "employees", label: "Employees", href: "/employees", icon: UserCog },
      { key: "team", label: "Team Performance", href: "/team", icon: Users2 },
    ],
  },
  {
    label: "System",
    items: [
      { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
      { key: "activity", label: "Activity Log", href: "/activity", icon: ScrollText },
      { key: "settings", label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
