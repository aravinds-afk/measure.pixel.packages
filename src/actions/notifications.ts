"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function markAllNotificationsRead() {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({ where: { userId: session.sub, read: false }, data: { read: true } });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markNotificationRead(id: string) {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/notifications");
}
