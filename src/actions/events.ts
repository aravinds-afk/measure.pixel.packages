"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { eventSchema } from "@/lib/validations/event";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

export async function createEventAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const event = await prisma.calendarEvent.create({
    data: { ...parsed.data, start: new Date(parsed.data.start), end: new Date(parsed.data.end), userId: session.sub },
  });

  revalidatePath("/calendar");
  return { ok: true, data: { id: event.id } };
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  await prisma.calendarEvent.delete({ where: { id } });
  revalidatePath("/calendar");
  return { ok: true };
}
