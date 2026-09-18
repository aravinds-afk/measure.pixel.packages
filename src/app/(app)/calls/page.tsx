import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { scopedUserIds } from "@/lib/data/scope";
import { PageHeader } from "@/components/ui/misc";
import CallsClient from "./calls-client";

export default async function CallsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userIds = await scopedUserIds(session);
  const [calls, customers, leads] = await Promise.all([
    prisma.call.findMany({
      where: userIds ? { employeeId: { in: userIds } } : {},
      include: { customer: { select: { id: true, name: true } }, lead: { select: { id: true, name: true } }, employee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    prisma.lead.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Calls"
        description="Track every call and its outcome."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Calls" }]}
      />
      <CallsClient
        initialCalls={calls.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), nextFollowUp: c.nextFollowUp?.toISOString() ?? null }))}
        customers={customers}
        leads={leads}
      />
    </div>
  );
}
