"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { createTaskAction, updateTaskStatusAction, deleteTaskAction } from "@/actions/tasks";
import { updateLeadStatusAction, deleteLeadAction } from "@/actions/leads";
import { updateDealStageAction, deleteDealAction } from "@/actions/deals";
import { createCustomerAction, deleteCustomerAction } from "@/actions/customers";
import { updateEmployeeRoleAction } from "@/actions/employees";
import { MODULE_ROUTE_PREFIX, ROLE_LABELS, ROLES } from "@/lib/rbac";
import { findModule } from "@/lib/assistant-nlu";
import type { LeadStatus, DealStage, Role } from "@prisma/client";

export type AssistantResult = { reply: string; navigateTo?: string };

const LEAD_STATUS_WORDS: Record<string, LeadStatus> = {
  new: "NEW", contacted: "CONTACTED", qualified: "QUALIFIED", proposal: "PROPOSAL",
  negotiation: "NEGOTIATION", won: "WON", lost: "LOST",
};

const DEAL_STAGE_WORDS: Record<string, DealStage> = {
  new: "NEW", qualified: "QUALIFIED", proposal: "PROPOSAL",
  negotiation: "NEGOTIATION", won: "WON", lost: "LOST",
};

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

  // Complete/delete task: "complete task <title>", "mark task <title> done", "delete task <title>"
  const completeTaskMatch = text.match(/^(?:complete|finish|mark)\s+task\s+(.+?)(?:\s+as\s+done|\s+done|\s+complete)?$/);
  if (completeTaskMatch) {
    const title = completeTaskMatch[1].trim();
    const [allowed, task] = await Promise.all([
      can(session.role, "tasks", "edit"),
      prisma.task.findFirst({ where: { title: { contains: title, mode: "insensitive" } } }),
    ]);
    if (!allowed) return { reply: "You don't have permission to update tasks." };
    if (!task) return { reply: `I couldn't find a task called "${title}".` };
    const res = await updateTaskStatusAction(task.id, "COMPLETED");
    if (!res.ok) return { reply: `Couldn't complete that task: ${res.error}` };
    return { reply: `Marked "${task.title}" as complete.`, navigateTo: "/tasks" };
  }

  const deleteTaskMatch = text.match(/^delete task\s+(.+)/);
  if (deleteTaskMatch) {
    const title = deleteTaskMatch[1].trim();
    const [allowed, task] = await Promise.all([
      can(session.role, "tasks", "delete"),
      prisma.task.findFirst({ where: { title: { contains: title, mode: "insensitive" } } }),
    ]);
    if (!allowed) return { reply: "You don't have permission to delete tasks." };
    if (!task) return { reply: `I couldn't find a task called "${title}".` };
    const res = await deleteTaskAction(task.id);
    if (!res.ok) return { reply: `Couldn't delete that task: ${res.error}` };
    return { reply: `Deleted task "${task.title}".`, navigateTo: "/tasks" };
  }

  // Quick customer: "add customer <name> phone <phone> email <email>"
  const customerMatch = text.match(/^(?:add|create)(?: a)? customer\s+(.+?)(?:\s+phone\s+([\d+\-\s()]+?))?(?:\s+email\s+(\S+))?$/);
  if (customerMatch) {
    const [, name, phone, email] = customerMatch;
    if (!phone || !email) return { reply: `To add a customer I need a phone and email too, e.g. "add customer ${name.trim()} phone 9876543210 email name@example.com".` };
    if (!(await can(session.role, "customers", "create"))) return { reply: "You don't have permission to create customers." };
    const res = await createCustomerAction({ name: name.trim(), phone: phone.trim(), email: email.trim(), status: "PROSPECT" });
    if (!res.ok) return { reply: `Couldn't create that customer: ${res.error}` };
    return { reply: `Added customer "${name.trim()}".`, navigateTo: `/customers/${res.data?.id ?? ""}` };
  }

  // Delete customer/lead/deal: "delete customer <name>", "delete lead <name>", "delete deal <name>"
  const deleteCustomerMatch = text.match(/^delete customer\s+(.+)/);
  if (deleteCustomerMatch) {
    const name = deleteCustomerMatch[1].trim();
    const [allowed, customer] = await Promise.all([
      can(session.role, "customers", "delete"),
      prisma.customer.findFirst({ where: { name: { contains: name, mode: "insensitive" } } }),
    ]);
    if (!allowed) return { reply: "You don't have permission to delete customers." };
    if (!customer) return { reply: `I couldn't find a customer named "${name}".` };
    const res = await deleteCustomerAction(customer.id);
    if (!res.ok) return { reply: `Couldn't delete that customer: ${res.error}` };
    return { reply: `Deleted customer "${customer.name}".`, navigateTo: "/customers" };
  }

  const deleteLeadMatch = text.match(/^delete lead\s+(.+)/);
  if (deleteLeadMatch) {
    const name = deleteLeadMatch[1].trim();
    const [allowed, lead] = await Promise.all([
      can(session.role, "leads", "delete"),
      prisma.lead.findFirst({ where: { name: { contains: name, mode: "insensitive" } } }),
    ]);
    if (!allowed) return { reply: "You don't have permission to delete leads." };
    if (!lead) return { reply: `I couldn't find a lead named "${name}".` };
    const res = await deleteLeadAction(lead.id);
    if (!res.ok) return { reply: `Couldn't delete that lead: ${res.error}` };
    return { reply: `Deleted lead "${lead.name}".`, navigateTo: "/leads" };
  }

  const deleteDealMatch = text.match(/^delete deal\s+(.+)/);
  if (deleteDealMatch) {
    const name = deleteDealMatch[1].trim();
    const [allowed, deal] = await Promise.all([
      can(session.role, "deals", "delete"),
      prisma.deal.findFirst({ where: { name: { contains: name, mode: "insensitive" } } }),
    ]);
    if (!allowed) return { reply: "You don't have permission to delete deals." };
    if (!deal) return { reply: `I couldn't find a deal named "${name}".` };
    const res = await deleteDealAction(deal.id);
    if (!res.ok) return { reply: `Couldn't delete that deal: ${res.error}` };
    return { reply: `Deleted deal "${deal.name}".`, navigateTo: "/deals" };
  }

  // Lead status: "mark lead <name> as <status>"
  const leadMatch = text.match(/^mark lead\s+(.+?)\s+as\s+(\w+)/);
  if (leadMatch) {
    const [, name, statusWord] = leadMatch;
    const status = LEAD_STATUS_WORDS[statusWord];
    if (!status) return { reply: `I don't know the lead status "${statusWord}".` };
    const [allowed, lead] = await Promise.all([
      can(session.role, "leads", "edit"),
      prisma.lead.findFirst({ where: { name: { contains: name, mode: "insensitive" } } }),
    ]);
    if (!allowed) return { reply: "You don't have permission to update leads." };
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
    const [allowed, deal] = await Promise.all([
      can(session.role, "deals", "edit"),
      prisma.deal.findFirst({ where: { name: { contains: name, mode: "insensitive" } } }),
    ]);
    if (!allowed) return { reply: "You don't have permission to update deals." };
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
      "I can navigate (\"open leads\"), add or complete a task, add a customer, update or delete a lead/deal/customer/task" +
      (session.role === "SUPER_ADMIN" ? ", change someone's role, or open Roles & Permissions" : "") +
      " — anything beyond what your role allows, I'll say so.",
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
