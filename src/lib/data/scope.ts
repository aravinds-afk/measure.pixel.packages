import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

/** Returns the set of user IDs whose data this session is allowed to see (null = everyone). */
export async function scopedUserIds(session: SessionPayload): Promise<string[] | null> {
  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") return null;
  if (session.role === "MANAGER") {
    const reports = await prisma.user.findMany({ where: { managerId: session.sub }, select: { id: true } });
    return [session.sub, ...reports.map((r) => r.id)];
  }
  return [session.sub];
}

export function isTeamOrAbove(role: SessionPayload["role"]) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}
