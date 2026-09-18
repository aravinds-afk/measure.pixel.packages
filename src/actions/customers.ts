"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { customerSchema } from "@/lib/validations/customer";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

export async function createCustomerAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const customer = await prisma.customer.create({
    data: { ...parsed.data, assignedToId: parsed.data.assignedToId || session.sub, lastContact: new Date() },
  });

  await prisma.activity.create({
    data: {
      userId: session.sub,
      action: "CREATE",
      module: "Customer",
      description: `created customer ${customer.name}`,
      customerId: customer.id,
    },
  });

  revalidatePath("/customers");
  return { ok: true, data: { id: customer.id } };
}

export async function updateCustomerAction(id: string, input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const customer = await prisma.customer.update({ where: { id }, data: parsed.data });

  await prisma.activity.create({
    data: { userId: session.sub, action: "UPDATE", module: "Customer", description: `updated customer ${customer.name}`, customerId: id },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true };
}

export async function deleteCustomerAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.role)) {
    return { ok: false, error: "You do not have permission to delete customers." };
  }

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return { ok: false, error: "Customer not found." };

  await prisma.customer.delete({ where: { id } });
  await prisma.activity.create({
    data: { userId: session.sub, action: "DELETE", module: "Customer", description: `deleted customer ${customer.name}` },
  });

  revalidatePath("/customers");
  return { ok: true };
}
