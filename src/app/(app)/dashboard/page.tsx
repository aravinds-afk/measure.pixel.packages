import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users, Target, Handshake, Trophy, XCircle, ListChecks, ClipboardList, Wallet,
  Receipt, TrendingUp, ArrowRight, Clock,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { getDashboardData } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RevenueAreaChart, DealsBarChart, LeadFunnelChart } from "@/components/ui/charts";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "CUSTOMER") redirect("/portal");

  const data = await getDashboardData(session);
  const showTeam = session.role === "SUPER_ADMIN" || session.role === "ADMIN" || session.role === "MANAGER";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session.name.split(" ")[0]}`}
        description={`Here's what's happening across your ${ROLE_LABELS[session.role].toLowerCase()} workspace today.`}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Customers" value={data.kpis.totalCustomers} icon={Users} tone="brand" />
        <StatCard label="New Leads" value={data.kpis.newLeads} icon={Target} tone="info" />
        <StatCard label="Active Deals" value={data.kpis.activeDeals} icon={Handshake} tone="brand" />
        <StatCard label="Won Deals" value={data.kpis.wonDeals} icon={Trophy} tone="success" />
        <StatCard label="Lost Deals" value={data.kpis.lostDeals} icon={XCircle} tone="danger" />
        <StatCard label="Pending Tasks" value={data.kpis.pendingTasks} icon={ListChecks} tone="warning" />
        <StatCard label="Today's Follow-ups" value={data.kpis.todaysFollowUps} icon={ClipboardList} tone="info" />
        <StatCard label="Revenue" value={formatCurrency(data.kpis.revenue)} icon={Wallet} tone="success" />
        <StatCard label="Pending Invoices" value={data.kpis.pendingInvoices} icon={Receipt} tone="warning" />
        <StatCard label="Conversion Rate" value={`${data.kpis.conversionRate}%`} icon={TrendingUp} tone="brand" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>Revenue collected over the last 6 months</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={data.revenueSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Lead Funnel</CardTitle>
              <CardDescription>New → Contacted → Qualified → Won</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LeadFunnelChart data={data.leadFunnel} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Won vs Lost Deals</CardTitle>
              <CardDescription>Monthly deal outcomes</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DealsBarChart data={data.dealsSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>Today and beyond</CardDescription>
            </div>
            <Link href="/tasks" className="text-xs font-medium text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcomingTasks.length === 0 && <p className="text-sm text-muted">No upcoming tasks. You&apos;re all clear.</p>}
            {data.upcomingTasks.map((t) => (
              <div key={t.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                  <Clock className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted">{t.customer?.name ?? t.assignedTo?.name ?? "Unassigned"} · {t.dueDate ? formatDate(t.dueDate) : "No due date"}</p>
                </div>
                <StatusBadge status={t.priority} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {showTeam && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>Leads, deals and revenue by employee</CardDescription>
              </div>
              <Link href="/team" className="text-xs font-medium text-brand hover:underline flex items-center gap-1">
                View team <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr className="border-b border-border">
                    <th className="py-2 font-medium">Employee</th>
                    <th className="py-2 font-medium">Leads</th>
                    <th className="py-2 font-medium">Deals Won</th>
                    <th className="py-2 font-medium">Revenue</th>
                    <th className="py-2 font-medium">Conversion</th>
                    <th className="py-2 font-medium">Tasks Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.teamPerformance.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} size="sm" />
                          <div>
                            <p className="font-medium text-foreground">{m.name}</p>
                            <p className="text-xs text-muted">{m.designation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">{m.leads}</td>
                      <td className="py-2.5">{m.deals}</td>
                      <td className="py-2.5">{formatCurrency(m.revenue)}</td>
                      <td className="py-2.5">{m.conversion}%</td>
                      <td className="py-2.5">{m.tasksCompleted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Card className={showTeam ? "" : "lg:col-span-3"}>
          <CardHeader>
            <div>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest actions across your workspace</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentActivities.length === 0 && <p className="text-sm text-muted">No recent activity.</p>}
            {data.recentActivities.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{a.user?.name ?? "System"}</span> {a.description}
                  </p>
                  <p className="text-xs text-muted">{a.module} · {timeAgo(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
