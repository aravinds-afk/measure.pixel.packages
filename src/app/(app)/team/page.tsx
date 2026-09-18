import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { scopedUserIds } from "@/lib/data/scope";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { DealsBarChart } from "@/components/ui/charts";
import { formatCurrency } from "@/lib/utils";
import { Users2, Target, Handshake, ListChecks } from "lucide-react";
import { ROLE_LABELS } from "@/lib/rbac";
import { format, subMonths } from "date-fns";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.role)) redirect("/dashboard");

  const userIds = await scopedUserIds(session);
  const members = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" }, ...(userIds ? { id: { in: userIds } } : {}) },
    select: { id: true, name: true, role: true, designation: true },
    orderBy: { name: "asc" },
  });

  const memberStats = await Promise.all(
    members.map(async (m) => {
      const [leads, deals, wonDeals, tasks, tasksCompleted, followUps] = await Promise.all([
        prisma.lead.count({ where: { assignedToId: m.id } }),
        prisma.deal.count({ where: { assignedToId: m.id, stage: { notIn: ["WON", "LOST"] } } }),
        prisma.deal.findMany({ where: { assignedToId: m.id, stage: "WON" } }),
        prisma.task.count({ where: { assignedToId: m.id } }),
        prisma.task.count({ where: { assignedToId: m.id, status: "COMPLETED" } }),
        prisma.followUp.count({ where: { assignedToId: m.id, status: "PENDING" } }),
      ]);
      return {
        ...m,
        leads, activeDeals: deals, dealsWon: wonDeals.length,
        revenue: wonDeals.reduce((s, d) => s + d.value, 0),
        tasks, tasksCompleted, pendingFollowUps: followUps,
      };
    })
  );

  const totalLeads = memberStats.reduce((s, m) => s + m.leads, 0);
  const totalDeals = memberStats.reduce((s, m) => s + m.activeDeals, 0);
  const totalRevenue = memberStats.reduce((s, m) => s + m.revenue, 0);
  const totalTasksDone = memberStats.reduce((s, m) => s + m.tasksCompleted, 0);

  const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
  const dealsData = await prisma.deal.findMany({ where: userIds ? { assignedToId: { in: userIds } } : {}, select: { stage: true, updatedAt: true } });
  const dealsSeries = months.map((m) => {
    const inMonth = dealsData.filter((d) => format(d.updatedAt, "MMM yyyy") === format(m, "MMM yyyy"));
    return { month: format(m, "MMM"), won: inMonth.filter((d) => d.stage === "WON").length, lost: inMonth.filter((d) => d.stage === "LOST").length };
  });

  return (
    <div>
      <PageHeader
        title="Team Performance"
        description="A complete view of your team's leads, deals and output."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Team" }]}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard label="Team Members" value={memberStats.length} icon={Users2} tone="brand" />
        <StatCard label="Assigned Leads" value={totalLeads} icon={Target} tone="info" />
        <StatCard label="Active Deals" value={totalDeals} icon={Handshake} tone="warning" />
        <StatCard label="Tasks Completed" value={totalTasksDone} icon={ListChecks} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Team Deal Outcomes</CardTitle></CardHeader>
          <CardContent><DealsBarChart data={dealsSeries} /></CardContent>
        </Card>
      </div>

      <p className="mb-3 text-sm font-semibold text-foreground">Total revenue this period: {formatCurrency(totalRevenue)}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memberStats.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={m.name} size="md" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{m.name}</p>
                <p className="text-xs text-muted truncate">{m.designation ?? ROLE_LABELS[m.role]}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted">Leads</p><p className="font-semibold text-foreground">{m.leads}</p></div>
              <div><p className="text-xs text-muted">Active Deals</p><p className="font-semibold text-foreground">{m.activeDeals}</p></div>
              <div><p className="text-xs text-muted">Deals Won</p><p className="font-semibold text-foreground">{m.dealsWon}</p></div>
              <div><p className="text-xs text-muted">Revenue</p><p className="font-semibold text-foreground">{formatCurrency(m.revenue)}</p></div>
              <div><p className="text-xs text-muted">Tasks Done</p><p className="font-semibold text-foreground">{m.tasksCompleted}/{m.tasks}</p></div>
              <div><p className="text-xs text-muted">Follow-ups</p><p className="font-semibold text-foreground">{m.pendingFollowUps} pending</p></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
