"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { emailSchema } from "@/lib/validations/email";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

export async function sendEmailAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const email = await prisma.email.create({
    data: { ...parsed.data, direction: "SENT", status: "SENT", employeeId: session.sub },
  });
  await prisma.activity.create({ data: { userId: session.sub, action: "SEND", module: "Email", description: `sent email "${email.subject}"`, customerId: email.customerId, leadId: email.leadId } });

  revalidatePath("/emails");
  return { ok: true, data: { id: email.id } };
}
