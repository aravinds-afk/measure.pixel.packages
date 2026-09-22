"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companySettingsSchema, userSettingsSchema, passwordChangeSchema } from "@/lib/validations/settings";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";
import { getPermissionsMap, invalidatePermissionsCache, ALL_MODULE_KEYS, type PermissionAction } from "@/lib/permissions";
import { ROLES, type ModuleKey } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export async function getRolePermissionsAction() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return null;
  return getPermissionsMap();
}

const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"];

export async function updateRolePermissionAction(
  role: string,
  moduleKey: string,
  action: PermissionAction,
  value: boolean
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return { ok: false, error: "Only Super Admin can change roles and permissions." };

  if (!ROLES.includes(role as Role) || role === "SUPER_ADMIN") return { ok: false, error: "Invalid role." };
  if (!ALL_MODULE_KEYS.includes(moduleKey as ModuleKey)) return { ok: false, error: "Invalid module." };
  if (!ACTIONS.includes(action)) return { ok: false, error: "Invalid action." };

  const map = await getPermissionsMap();
  const current = map[role as Role][moduleKey as ModuleKey] ?? { view: false, create: false, edit: false, delete: false };
  const next = { ...current, [action]: value };
  // Create/edit/delete implicitly require view; turning on a write also turns on view.
  if (value && action !== "view") next.view = true;
  if (action === "view" && !value) { next.create = false; next.edit = false; next.delete = false; }

  await prisma.rolePermission.upsert({
    where: { role_module: { role: role as Role, module: moduleKey } },
    create: { role: role as Role, module: moduleKey, canView: next.view, canCreate: next.create, canEdit: next.edit, canDelete: next.delete },
    update: { canView: next.view, canCreate: next.create, canEdit: next.edit, canDelete: next.delete },
  });

  await prisma.activity.create({
    data: { userId: session.sub, action: "UPDATE", module: "Permissions", description: `updated ${moduleKey} permissions for ${role}` },
  });

  invalidatePermissionsCache();
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

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
