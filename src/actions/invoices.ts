"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { invoiceSchema, paymentSchema } from "@/lib/validations/invoice";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

async function nextInvoiceNumber() {
  const count = await prisma.invoice.count();
  return `INV-${3000 + count}`;
}

export async function createInvoiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "invoices", "create"))) return { ok: false, error: "You do not have permission to do that." };

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const { items, ...rest } = parsed.data;
  const invoice = await prisma.invoice.create({
    data: {
      ...rest,
      number: await nextInvoiceNumber(),
      issueDate: new Date(rest.issueDate),
      dueDate: new Date(rest.dueDate),
      items: { create: items },
    },
  });

  await prisma.activity.create({ data: { userId: session.sub, action: "CREATE", module: "Invoice", description: `generated invoice ${invoice.number}`, customerId: invoice.customerId } });
  await prisma.notification.create({ data: { userId: session.sub, title: "Invoice created", message: `${invoice.number} was generated`, type: "INVOICE" } });

  revalidatePath("/invoices");
  return { ok: true, data: { id: invoice.id } };
}

export async function updateInvoiceAction(id: string, input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "invoices", "edit"))) return { ok: false, error: "You do not have permission to do that." };

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const { items, ...rest } = parsed.data;
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { ...rest, issueDate: new Date(rest.issueDate), dueDate: new Date(rest.dueDate), items: { create: items } },
  });

  await prisma.activity.create({ data: { userId: session.sub, action: "UPDATE", module: "Invoice", description: `updated invoice ${invoice.number}` } });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { ok: true };
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "invoices", "delete"))) return { ok: false, error: "You do not have permission to do that." };

  await prisma.payment.deleteMany({ where: { invoiceId: id } });
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
  await prisma.invoice.delete({ where: { id } });

  revalidatePath("/invoices");
  return { ok: true };
}

export async function recordPaymentAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!(await can(session.role, "invoices", "edit"))) return { ok: false, error: "You do not have permission to do that." };

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId }, include: { items: true, payments: true } });
  if (!invoice) return { ok: false, error: "Invoice not found." };

  await prisma.payment.create({
    data: { invoiceId: invoice.id, customerId: invoice.customerId, amount: parsed.data.amount, method: parsed.data.method, status: "SUCCESS" },
  });

  const total = invoice.items.reduce((s, it) => s + it.price * it.quantity, 0) * (1 + invoice.tax / 100) * (1 - invoice.discount / 100);
  const paidSoFar = invoice.payments.reduce((s, p) => s + p.amount, 0) + parsed.data.amount;
  const newStatus = paidSoFar >= total ? "PAID" : "PARTIALLY_PAID";
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } });

  await prisma.activity.create({ data: { userId: session.sub, action: "RECEIVE", module: "Payment", description: `recorded payment for ${invoice.number}`, customerId: invoice.customerId } });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/payments");
  return { ok: true };
}
