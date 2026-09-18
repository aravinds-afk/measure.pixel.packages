"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { documentSchema } from "@/lib/validations/document";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

export async function uploadDocumentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const doc = await prisma.document.create({ data: { ...parsed.data, uploadedById: session.sub } });
  await prisma.activity.create({ data: { userId: session.sub, action: "UPLOAD", module: "Document", description: `uploaded ${doc.name}`, customerId: doc.customerId } });

  revalidatePath("/documents");
  return { ok: true, data: { id: doc.id } };
}

export async function renameDocumentAction(id: string, name: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!name.trim()) return { ok: false, error: "File name cannot be empty." };

  await prisma.document.update({ where: { id }, data: { name } });
  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  await prisma.document.delete({ where: { id } });
  revalidatePath("/documents");
  return { ok: true };
}
