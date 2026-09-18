import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, Calendar as CalendarIcon, Target, Handshake, ListChecks, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { manager: { select: { name: true } }, company: true } });
  if (!user) redirect("/login");

  const [leads, deals, wonDeals, tasksCompleted, pendingTasks] = await Promise.all([
    prisma.lead.count({ where: { assignedToId: user.id } }),
    prisma.deal.count({ where: { assignedToId: user.id } }),
    prisma.deal.findMany({ where: { assignedToId: user.id, stage: "WON" } }),
    prisma.task.count({ where: { assignedToId: user.id, status: "COMPLETED" } }),
    prisma.task.count({ where: { assignedToId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="My Profile"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Profile" }]}
        actions={<Button href="/settings" variant="outline"><SettingsIcon className="size-4" /> Edit in Settings</Button>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="h-fit">
          <CardContent className="p-6 text-center">
            <Avatar name={user.name} size="lg" className="mx-auto" />
            <p className="mt-3 font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted">{user.designation ?? ROLE_LABELS[user.role]}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
              <Badge tone={user.status === "ACTIVE" ? "success" : "neutral"}>{user.status}</Badge>
            </div>
            <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-left text-sm">
              <div className="flex items-center gap-2.5 text-muted"><Mail className="size-4" /><span className="text-foreground truncate">{user.email}</span></div>
              {user.phone && <div className="flex items-center gap-2.5 text-muted"><Phone className="size-4" /><span className="text-foreground">{user.phone}</span></div>}
              {user.department && <div className="flex items-center gap-2.5 text-muted"><Building2 className="size-4" /><span className="text-foreground">{user.department}</span></div>}
              <div className="flex items-center gap-2.5 text-muted"><CalendarIcon className="size-4" /><span className="text-foreground">Joined {formatDate(user.joiningDate)}</span></div>
            </div>
            {user.manager && <p className="mt-4 text-xs text-muted">Reports to <span className="text-foreground">{user.manager.name}</span></p>}
            {user.company && <p className="mt-1 text-xs text-muted">{user.company.name}</p>}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-foreground">Personal performance</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Assigned Leads" value={leads} icon={Target} tone="info" />
            <StatCard label="Assigned Deals" value={deals} icon={Handshake} tone="brand" />
            <StatCard label="Revenue Won" value={formatCurrency(wonDeals.reduce((s, d) => s + d.value, 0))} icon={Handshake} tone="success" />
            <StatCard label="Tasks Completed" value={tasksCompleted} icon={ListChecks} tone="warning" />
          </div>
          <Card className="mt-5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-foreground mb-1">Workload</p>
              <p className="text-xs text-muted mb-3">{pendingTasks} tasks currently in progress or pending</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-brand" style={{ width: `${Math.min(100, (tasksCompleted / (tasksCompleted + pendingTasks || 1)) * 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
