import "server-only";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { SessionPayload } from "@/lib/session";

export async function getPortalCustomer(session: SessionPayload) {
  const customer = await prisma.customer.findUnique({ where: { portalUserId: session.sub } });
  if (!customer) redirect("/portal/setup-pending");
  return customer;
}
