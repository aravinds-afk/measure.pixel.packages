"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { followUpSchema } from "@/lib/validations/followup";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

function normalize(data: ReturnType<typeof followUpSchema.parse>) {
  return { ...data, scheduledAt: new Date(data.scheduledAt), reminder: data.reminder ?? true };
}

export async function createFollowUpAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const followUp = await prisma.followUp.create({ data: { ...normalize(parsed.data), assignedToId: parsed.data.assignedToId || session.sub } });
  await prisma.activity.create({ data: { userId: session.sub, action: "CREATE", module: "FollowUp", description: `scheduled a ${followUp.type.toLowerCase()} follow-up` } });

  revalidatePath("/followups");
  return { ok: true, data: { id: followUp.id } };
}

export async function updateFollowUpAction(id: string, input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  await prisma.followUp.update({ where: { id }, data: normalize(parsed.data) });
  revalidatePath("/followups");
  return { ok: true };
}

export async function completeFollowUpAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  await prisma.followUp.update({ where: { id }, data: { status: "COMPLETED" } });
  await prisma.activity.create({ data: { userId: session.sub, action: "COMPLETE", module: "FollowUp", description: "completed a follow-up" } });

  revalidatePath("/followups");
  return { ok: true };
}

export async function deleteFollowUpAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  await prisma.followUp.delete({ where: { id } });
  revalidatePath("/followups");
  return { ok: true };
}
