import "server-only";
import { prisma } from "@/lib/prisma";

export async function getStaffList() {
  return prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    select: { id: true, name: true, role: true, designation: true },
    orderBy: { name: "asc" },
  });
}
