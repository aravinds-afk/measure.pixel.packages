"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { createTaskAction } from "@/actions/tasks";
import { updateLeadStatusAction } from "@/actions/leads";
import { updateDealStageAction } from "@/actions/deals";
import { updateEmployeeRoleAction } from "@/actions/employees";
import { MODULE_ROUTE_PREFIX, ROLE_LABELS, ROLES, type ModuleKey } from "@/lib/rbac";
import type { LeadStatus, DealStage, Role } from "@prisma/client";

export type AssistantResult = { reply: string; navigateTo?: string };

const MODULE_ALIASES: Record<string, ModuleKey> = {
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

const LEAD_STATUS_WORDS: Record<string, LeadStatus> = {
  new: "NEW", contacted: "CONTACTED", qualified: "QUALIFIED", proposal: "PROPOSAL",
  negotiation: "NEGOTIATION", won: "WON", lost: "LOST",
};

const DEAL_STAGE_WORDS: Record<string, DealStage> = {
  new: "NEW", qualified: "QUALIFIED", proposal: "PROPOSAL",
  negotiation: "NEGOTIATION", won: "WON", lost: "LOST",
};

function findModule(text: string): ModuleKey | null {
  for (const [alias, key] of Object.entries(MODULE_ALIASES)) {
    if (text.includes(alias)) return key;
  }
  return null;
}

export async function runAssistantCommand(rawText: string): Promise<AssistantResult> {
  const session = await getSession();
  if (!session) return { reply: "You're not signed in." };

  const text = rawText.trim().toLowerCase();
  if (!text) return { reply: "I didn't catch that. Try again." };

  // Navigation: "open/show/go to <module>"
  if (/^(open|show|go to|navigate to|take me to)\b/.test(text)) {
    const moduleKey = findModule(text);
    if (!moduleKey) return { reply: "I'm not sure which page you mean. Try \"open leads\" or \"open customers\"." };
    if (!(await can(session.role, moduleKey, "view")) && moduleKey !== "dashboard" && moduleKey !== "profile") {
      return { reply: `You don't have access to ${moduleKey}.` };
    }
    return { reply: `Opening ${moduleKey}.`, navigateTo: MODULE_ROUTE_PREFIX[moduleKey] };
  }

  // Quick task: "add task ...", "remind me to ...", "create a task ..."
  const taskMatch = text.match(/^(?:add|create)(?: a)? task(?: to)?\s+(.+)/) || text.match(/^remind me to\s+(.+)/);
  if (taskMatch) {
    const title = taskMatch[1].trim();
    if (!title) return { reply: "What should the task say?" };
    if (!(await can(session.role, "tasks", "create"))) return { reply: "You don't have permission to create tasks." };
    const res = await createTaskAction({ title: title.charAt(0).toUpperCase() + title.slice(1), priority: "MEDIUM", status: "TODO" });
    if (!res.ok) return { reply: `Couldn't create that task: ${res.error}` };
    return { reply: `Added task: "${title}".`, navigateTo: "/tasks" };
  }

  // Lead status: "mark lead <name> as <status>"
  const leadMatch = text.match(/^mark lead\s+(.+?)\s+as\s+(\w+)/);
  if (leadMatch) {
    const [, name, statusWord] = leadMatch;
    const status = LEAD_STATUS_WORDS[statusWord];
    if (!status) return { reply: `I don't know the lead status "${statusWord}".` };
    if (!(await can(session.role, "leads", "edit"))) return { reply: "You don't have permission to update leads." };
    const lead = await prisma.lead.findFirst({ where: { name: { contains: name, mode: "insensitive" } } });
    if (!lead) return { reply: `I couldn't find a lead named "${name}".` };
    const res = await updateLeadStatusAction(lead.id, status);
    if (!res.ok) return { reply: `Couldn't update that lead: ${res.error}` };
    return { reply: `Marked ${lead.name} as ${status.toLowerCase()}.`, navigateTo: `/leads/${lead.id}` };
  }

  // Deal stage: "mark deal <name> as <stage>"
  const dealMatch = text.match(/^mark deal\s+(.+?)\s+as\s+(\w+)/);
  if (dealMatch) {
    const [, name, stageWord] = dealMatch;
    const stage = DEAL_STAGE_WORDS[stageWord];
    if (!stage) return { reply: `I don't know the deal stage "${stageWord}".` };
    if (!(await can(session.role, "deals", "edit"))) return { reply: "You don't have permission to update deals." };
    const deal = await prisma.deal.findFirst({ where: { name: { contains: name, mode: "insensitive" } } });
    if (!deal) return { reply: `I couldn't find a deal named "${name}".` };
    const res = await updateDealStageAction(deal.id, stage);
    if (!res.ok) return { reply: `Couldn't update that deal: ${res.error}` };
    return { reply: `Marked ${deal.name} as ${stage.toLowerCase()}.`, navigateTo: `/deals/${deal.id}` };
  }

  // Role change (Super Admin only): "make <name> a/an <role>", "give <name> the <role> role"
  const roleMatch =
    text.match(/^(?:make|set)\s+(.+?)\s+(?:a|an|the)\s+(.+?)(?:\s+role)?$/) ||
    text.match(/^give\s+(.+?)\s+the\s+(.+?)\s+role$/);
  if (roleMatch) {
    if (session.role !== "SUPER_ADMIN") return { reply: "Only Super Admin can change roles." };
    const [, name, roleWords] = roleMatch;
    const role = matchRole(roleWords);
    if (!role) return { reply: `I don't recognize the role "${roleWords}".` };
    if (role === "CUSTOMER" || role === "SUPER_ADMIN") return { reply: "I can't assign that role by voice. Use the Employees page for that." };
    const employee = await prisma.user.findFirst({
      where: { OR: [{ name: { contains: name, mode: "insensitive" } }, { email: { contains: name, mode: "insensitive" } }] },
    });
    if (!employee) return { reply: `I couldn't find an employee named "${name}".` };
    const res = await updateEmployeeRoleAction(employee.id, role);
    if (!res.ok) return { reply: `Couldn't change that role: ${res.error}` };
    return { reply: `${employee.name} is now ${ROLE_LABELS[role]}.`, navigateTo: `/employees/${employee.id}` };
  }

  // Navigate to settings for permission editing (super admin)
  if (/permission|roles and permissions/.test(text)) {
    if (session.role !== "SUPER_ADMIN") return { reply: "Only Super Admin can manage roles and permissions." };
    return { reply: "Opening Roles & Permissions in Settings.", navigateTo: "/settings" };
  }

  return {
    reply:
      "I can navigate (\"open leads\"), add a task (\"add task call John tomorrow\"), update a lead or deal (\"mark deal Acme as won\")" +
      (session.role === "SUPER_ADMIN" ? ", or change someone's role (\"make Priya a manager\")." : "."),
  };
}

function matchRole(words: string): Role | null {
  const normalized = words.trim().toLowerCase().replace(/\s+/g, "_");
  for (const role of ROLES) {
    if (role.toLowerCase() === normalized) return role;
    if (ROLE_LABELS[role].toLowerCase().replace(/\s+/g, "_") === normalized) return role;
  }
  return null;
}
