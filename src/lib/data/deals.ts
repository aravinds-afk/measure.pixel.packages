import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { scopedUserIds } from "@/lib/data/scope";

export async function getScopedDeals(session: SessionPayload) {
  const userIds = await scopedUserIds(session);
  return prisma.deal.findMany({
    where: userIds ? { assignedToId: { in: userIds } } : {},
    include: {
      assignedTo: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
