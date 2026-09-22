"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { taskSchema } from "@/lib/validations/task";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";
import type { TaskStatus } from "@prisma/client";

function normalize(data: ReturnType<typeof taskSchema.parse>) {
  return { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : null, reminder: data.reminder ?? false };
}

export async function createTaskAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "tasks", "create"))) return { ok: false, error: "You do not have permission to do that." };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const task = await prisma.task.create({ data: { ...normalize(parsed.data), assignedToId: parsed.data.assignedToId || session.sub } });
  await prisma.activity.create({ data: { userId: session.sub, action: "CREATE", module: "Task", description: `created task "${task.title}"` } });
  if (task.assignedToId) {
    await prisma.notification.create({ data: { userId: task.assignedToId, title: "New task assigned", message: task.title, type: "TASK" } });
  }

  revalidatePath("/tasks");
  return { ok: true, data: { id: task.id } };
}

export async function updateTaskAction(id: string, input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "tasks", "edit"))) return { ok: false, error: "You do not have permission to do that." };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const task = await prisma.task.update({ where: { id }, data: normalize(parsed.data) });
  await prisma.activity.create({ data: { userId: session.sub, action: "UPDATE", module: "Task", description: `updated task "${task.title}"` } });

  revalidatePath("/tasks");
  return { ok: true };
}

export async function updateTaskStatusAction(id: string, status: TaskStatus): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "tasks", "edit"))) return { ok: false, error: "You do not have permission to do that." };

  const task = await prisma.task.update({ where: { id }, data: { status } });
  if (status === "COMPLETED") {
    await prisma.activity.create({ data: { userId: session.sub, action: "COMPLETE", module: "Task", description: `completed task "${task.title}"` } });
  }

  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "tasks", "delete"))) return { ok: false, error: "You do not have permission to do that." };

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return { ok: false, error: "Task not found." };

  await prisma.task.delete({ where: { id } });
  await prisma.activity.create({ data: { userId: session.sub, action: "DELETE", module: "Task", description: `deleted task "${task.title}"` } });

  revalidatePath("/tasks");
  return { ok: true };
}
