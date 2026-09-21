"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { dealSchema } from "@/lib/validations/deal";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";
import type { DealStage } from "@prisma/client";

function normalize(data: ReturnType<typeof dealSchema.parse>) {
  return { ...data, expectedClose: data.expectedClose ? new Date(data.expectedClose) : null };
}

export async function createDealAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "deals", "create"))) return { ok: false, error: "You do not have permission to do that." };

  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const deal = await prisma.deal.create({ data: { ...normalize(parsed.data), assignedToId: parsed.data.assignedToId || session.sub } });
  await prisma.activity.create({ data: { userId: session.sub, action: "CREATE", module: "Deal", description: `created deal ${deal.name}`, dealId: deal.id } });

  revalidatePath("/deals");
  revalidatePath("/pipeline");
  return { ok: true, data: { id: deal.id } };
}

export async function updateDealAction(id: string, input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "deals", "edit"))) return { ok: false, error: "You do not have permission to do that." };

  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const deal = await prisma.deal.update({ where: { id }, data: normalize(parsed.data) });
  await prisma.activity.create({ data: { userId: session.sub, action: "UPDATE", module: "Deal", description: `updated deal ${deal.name}`, dealId: id } });

  revalidatePath("/deals");
  revalidatePath("/pipeline");
  revalidatePath(`/deals/${id}`);
  return { ok: true };
}

export async function updateDealStageAction(id: string, stage: DealStage): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "deals", "edit"))) return { ok: false, error: "You do not have permission to do that." };

  const deal = await prisma.deal.update({
    where: { id },
    data: { stage, probability: stage === "WON" ? 100 : stage === "LOST" ? 0 : undefined },
  });
  await prisma.activity.create({ data: { userId: session.sub, action: "UPDATE", module: "Deal", description: `moved deal ${deal.name} to ${stage}`, dealId: id } });

  revalidatePath("/deals");
  revalidatePath("/pipeline");
  return { ok: true };
}

export async function deleteDealAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "deals", "delete"))) return { ok: false, error: "You do not have permission to do that." };

  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) return { ok: false, error: "Deal not found." };

  await prisma.deal.delete({ where: { id } });
  await prisma.activity.create({ data: { userId: session.sub, action: "DELETE", module: "Deal", description: `deleted deal ${deal.name}` } });

  revalidatePath("/deals");
  revalidatePath("/pipeline");
  return { ok: true };
}
