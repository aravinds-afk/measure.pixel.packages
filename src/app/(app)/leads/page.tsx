import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { scopedUserIds } from "@/lib/data/scope";
import { getStaffList } from "@/lib/data/staff";
import { PageHeader } from "@/components/ui/misc";
import LeadsClient from "./leads-client";

export default async function LeadsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userIds = await scopedUserIds(session);
  const [leads, staff] = await Promise.all([
    prisma.lead.findMany({
      where: userIds ? { assignedToId: { in: userIds } } : {},
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getStaffList(),
  ]);

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Track and convert leads through your sales pipeline."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Leads" }]}
      />
      <LeadsClient
        initialLeads={leads.map((l) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
          nextFollowUp: l.nextFollowUp?.toISOString() ?? null,
        }))}
        staff={staff}
      />
    </div>
  );
}
