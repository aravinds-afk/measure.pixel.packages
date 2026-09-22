import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import { Mail, Phone, Target, Users, Handshake, ListChecks } from "lucide-react";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.role)) redirect("/dashboard");

  const employee = await prisma.user.findUnique({ where: { id }, include: { manager: { select: { name: true } } } });
  if (!employee) notFound();

  const [leads, customers, deals, tasks, tasksCompleted] = await Promise.all([
    prisma.lead.findMany({ where: { assignedToId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.customer.findMany({ where: { assignedToId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.deal.findMany({ where: { assignedToId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.task.findMany({ where: { assignedToId: id }, orderBy: { dueDate: "asc" }, take: 20 }),
    prisma.task.count({ where: { assignedToId: id, status: "COMPLETED" } }),
  ]);

  const wonDeals = deals.filter((d) => d.stage === "WON");
  const revenue = wonDeals.reduce((s, d) => s + d.value, 0);
  const conversion = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={employee.name}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Employees", href: "/employees" }, { label: employee.name }]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="h-fit">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={employee.name} size="lg" />
              <div>
                <p className="font-semibold text-foreground">{employee.name}</p>
                <p className="text-sm text-muted">{employee.designation ?? ROLE_LABELS[employee.role]}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2"><StatusBadge status={ROLE_LABELS[employee.role]} /><StatusBadge status={employee.status} /></div>
            <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex items-center gap-2.5 text-muted"><Mail className="size-4" /><span className="text-foreground">{employee.email}</span></div>
              {employee.phone && <div className="flex items-center gap-2.5 text-muted"><Phone className="size-4" /><span className="text-foreground">{employee.phone}</span></div>}
            </div>
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted space-y-1">
              <p>Department: <span className="text-foreground">{employee.department ?? "—"}</span></p>
              <p>Reports to: <span className="text-foreground">{employee.manager?.name ?? "—"}</span></p>
              <p>Joined: <span className="text-foreground">{formatDate(employee.joiningDate)}</span></p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <StatCard label="Leads" value={leads.length} icon={Target} tone="info" />
            <StatCard label="Customers" value={customers.length} icon={Users} tone="brand" />
            <StatCard label="Revenue" value={formatCurrency(revenue)} icon={Handshake} tone="success" />
            <StatCard label="Tasks Done" value={tasksCompleted} icon={ListChecks} tone="warning" />
          </div>

          <Card>
            <CardContent className="p-5">
              <p className="mb-1 text-sm font-semibold text-foreground">Performance summary</p>
              <p className="text-xs text-muted mb-4">{conversion}% deal conversion rate across {deals.length} deals</p>
              <Tabs defaultValue="leads">
                <TabsList>
                  <TabsTrigger value="leads">Leads</TabsTrigger>
                  <TabsTrigger value="customers">Customers</TabsTrigger>
                  <TabsTrigger value="deals">Deals</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                </TabsList>
                <TabsContent value="leads">
                  {leads.length === 0 ? <EmptyState title="No leads assigned" /> : (
                    <div className="space-y-2">{leads.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                        <p className="font-medium text-foreground">{l.name}</p><StatusBadge status={l.status} />
                      </div>
                    ))}</div>
                  )}
                </TabsContent>
                <TabsContent value="customers">
                  {customers.length === 0 ? <EmptyState title="No customers assigned" /> : (
                    <div className="space-y-2">{customers.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                        <p className="font-medium text-foreground">{c.name}</p><StatusBadge status={c.status} />
                      </div>
                    ))}</div>
                  )}
                </TabsContent>
                <TabsContent value="deals">
                  {deals.length === 0 ? <EmptyState title="No deals assigned" /> : (
                    <div className="space-y-2">{deals.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                        <div><p className="font-medium text-foreground">{d.name}</p><p className="text-xs text-muted">{formatCurrency(d.value)}</p></div><StatusBadge status={d.stage} />
                      </div>
                    ))}</div>
                  )}
                </TabsContent>
                <TabsContent value="tasks">
                  {tasks.length === 0 ? <EmptyState title="No tasks assigned" /> : (
                    <div className="space-y-2">{tasks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                        <p className="font-medium text-foreground">{t.title}</p><StatusBadge status={t.status} />
                      </div>
                    ))}</div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
