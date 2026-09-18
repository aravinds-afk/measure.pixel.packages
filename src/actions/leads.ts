"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { leadSchema } from "@/lib/validations/lead";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";
import type { LeadStatus } from "@prisma/client";

function normalize(data: ReturnType<typeof leadSchema.parse>) {
  return { ...data, nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : null };
}

export async function createLeadAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const lead = await prisma.lead.create({ data: { ...normalize(parsed.data), assignedToId: parsed.data.assignedToId || session.sub } });
  await prisma.activity.create({ data: { userId: session.sub, action: "CREATE", module: "Lead", description: `created lead ${lead.name}`, leadId: lead.id } });

  revalidatePath("/leads");
  return { ok: true, data: { id: lead.id } };
}

export async function updateLeadAction(id: string, input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const lead = await prisma.lead.update({ where: { id }, data: normalize(parsed.data) });
  await prisma.activity.create({ data: { userId: session.sub, action: "UPDATE", module: "Lead", description: `updated lead ${lead.name}`, leadId: id } });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true };
}

export async function updateLeadStatusAction(id: string, status: LeadStatus): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const lead = await prisma.lead.update({ where: { id }, data: { status, convertedAt: status === "WON" ? new Date() : undefined } });
  await prisma.activity.create({ data: { userId: session.sub, action: "UPDATE", module: "Lead", description: `moved lead ${lead.name} to ${status.replace(/_/g, " ")}`, leadId: id } });

  revalidatePath("/leads");
  return { ok: true };
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return { ok: false, error: "Lead not found." };

  await prisma.lead.delete({ where: { id } });
  await prisma.activity.create({ data: { userId: session.sub, action: "DELETE", module: "Lead", description: `deleted lead ${lead.name}` } });

  revalidatePath("/leads");
  return { ok: true };
}

export async function convertLeadToCustomerAction(id: string): Promise<ActionResult<{ customerId: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return { ok: false, error: "Lead not found." };

  const customer = await prisma.customer.create({
    data: {
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      status: "ACTIVE",
      assignedToId: lead.assignedToId,
      lastContact: new Date(),
      notes: lead.notes,
    },
  });

  await prisma.lead.update({ where: { id }, data: { status: "WON", customerId: customer.id, convertedAt: new Date() } });
  await prisma.activity.create({
    data: { userId: session.sub, action: "CONVERT", module: "Lead", description: `converted lead ${lead.name} into a customer`, leadId: id, customerId: customer.id },
  });

  revalidatePath("/leads");
  revalidatePath("/customers");
  return { ok: true, data: { customerId: customer.id } };
}
