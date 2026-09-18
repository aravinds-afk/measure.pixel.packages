"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { callSchema } from "@/lib/validations/call";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

export async function createCallAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = callSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const call = await prisma.call.create({
    data: { ...parsed.data, nextFollowUp: parsed.data.nextFollowUp ? new Date(parsed.data.nextFollowUp) : null, employeeId: session.sub },
  });
  await prisma.activity.create({ data: { userId: session.sub, action: "CREATE", module: "Call", description: `logged a ${call.direction.toLowerCase()} call`, customerId: call.customerId, leadId: call.leadId } });

  revalidatePath("/calls");
  return { ok: true, data: { id: call.id } };
}

export async function deleteCallAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  await prisma.call.delete({ where: { id } });
  revalidatePath("/calls");
  return { ok: true };
}
