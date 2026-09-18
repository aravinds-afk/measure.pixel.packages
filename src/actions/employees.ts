"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { employeeSchema } from "@/lib/validations/employee";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

const DEFAULT_PASSWORD = "Welcome123!";

function requireAdmin(role: string) {
  return ["SUPER_ADMIN", "ADMIN"].includes(role);
}

export async function createEmployeeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session || !requireAdmin(session.role)) return { ok: false, error: "You do not have permission to add employees." };

  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return { ok: false, error: "An account with this email already exists.", fieldErrors: { email: "Already in use" } };

  const me = await prisma.user.findUnique({ where: { id: session.sub } });
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const employee = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      department: parsed.data.department,
      designation: parsed.data.designation,
      role: parsed.data.role,
      managerId: parsed.data.managerId || null,
      status: parsed.data.status,
      companyId: me?.companyId,
      passwordHash,
    },
  });

  await prisma.activity.create({ data: { userId: session.sub, action: "CREATE", module: "Employee", description: `added employee ${employee.name}` } });

  revalidatePath("/employees");
  return { ok: true, data: { id: employee.id } };
}

export async function updateEmployeeAction(id: string, input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !requireAdmin(session.role)) return { ok: false, error: "You do not have permission to edit employees." };

  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const employee = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      department: parsed.data.department,
      designation: parsed.data.designation,
      role: parsed.data.role,
      managerId: parsed.data.managerId || null,
      status: parsed.data.status,
    },
  });

  await prisma.activity.create({ data: { userId: session.sub, action: "UPDATE", module: "Employee", description: `updated employee ${employee.name}` } });

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { ok: true };
}

export async function toggleEmployeeStatusAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !requireAdmin(session.role)) return { ok: false, error: "You do not have permission." };

  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee) return { ok: false, error: "Employee not found." };

  const newStatus = employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.user.update({ where: { id }, data: { status: newStatus } });
  await prisma.activity.create({ data: { userId: session.sub, action: "UPDATE", module: "Employee", description: `${newStatus === "ACTIVE" ? "activated" : "deactivated"} ${employee.name}` } });

  revalidatePath("/employees");
  return { ok: true };
}
