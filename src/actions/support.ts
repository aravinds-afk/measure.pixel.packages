"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";
import { z } from "zod";

const schema = z.object({ subject: z.string().min(2, "Subject is required"), message: z.string().min(5, "Please describe your request") });

export async function createSupportRequestAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const customer = await prisma.customer.findUnique({ where: { portalUserId: session.sub } });
  await prisma.activity.create({
    data: {
      userId: session.sub,
      action: "SUPPORT_REQUEST",
      module: "Support",
      description: `${parsed.data.subject}: ${parsed.data.message}`,
      customerId: customer?.id,
    },
  });

  if (customer?.assignedToId) {
    await prisma.notification.create({
      data: { userId: customer.assignedToId, title: "New support request", message: `${customer.name}: ${parsed.data.subject}`, type: "SUPPORT" },
    });
  }

  revalidatePath("/portal/support");
  return { ok: true };
}
