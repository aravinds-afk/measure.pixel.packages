"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companySettingsSchema, userSettingsSchema, passwordChangeSchema } from "@/lib/validations/settings";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

export async function updateCompanySettingsAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) return { ok: false, error: "You do not have permission to edit company settings." };

  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user?.companyId) return { ok: false, error: "No company found." };

  await prisma.company.update({ where: { id: user.companyId }, data: parsed.data });
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateUserSettingsAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = userSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  await prisma.user.update({ where: { id: session.sub }, data: parsed.data });
  revalidatePath("/settings");
  revalidatePath("/profile");
  return { ok: true };
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return { ok: false, error: "User not found." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "Current password is incorrect.", fieldErrors: { currentPassword: "Incorrect password" } };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: session.sub }, data: { passwordHash } });
  return { ok: true };
}
