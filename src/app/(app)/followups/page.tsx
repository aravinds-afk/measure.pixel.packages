import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { scopedUserIds } from "@/lib/data/scope";
import { getStaffList } from "@/lib/data/staff";
import { PageHeader } from "@/components/ui/misc";
import FollowUpsClient from "./followups-client";

export default async function FollowUpsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userIds = await scopedUserIds(session);
  const [followUps, staff, customers, leads] = await Promise.all([
    prisma.followUp.findMany({
      where: userIds ? { assignedToId: { in: userIds } } : {},
      include: { assignedTo: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } }, lead: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    getStaffList(),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.lead.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // Mark stale pending follow-ups as overdue for display purposes.
  const now = new Date();
  const normalized = followUps.map((f) => ({
    ...f,
    status: f.status === "PENDING" && f.scheduledAt < now ? "OVERDUE" : f.status,
    scheduledAt: f.scheduledAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Never miss a scheduled touchpoint with a lead or customer."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Follow-ups" }]}
      />
      <FollowUpsClient initialFollowUps={normalized} staff={staff} customers={customers} leads={leads} />
    </div>
  );
}
