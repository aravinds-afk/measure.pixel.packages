import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [deals, leads, customers, payments, tasks, followUps, staff] = await Promise.all([
    prisma.deal.findMany({ include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.lead.findMany({ include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.customer.findMany(),
    prisma.payment.findMany(),
    prisma.task.findMany({ include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.followUp.findMany({ include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.user.findMany({ where: { role: { not: "CUSTOMER" } }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Deep insights into sales, leads, customers and finances."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]}
      />
      <ReportsClient
        deals={deals.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
        leads={leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
        customers={customers.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
        payments={payments.map((p) => ({ ...p, paidAt: p.paidAt.toISOString() }))}
        tasks={tasks.map((t) => ({ ...t, dueDate: t.dueDate?.toISOString() ?? null }))}
        followUps={followUps.map((f) => ({ ...f, scheduledAt: f.scheduledAt.toISOString() }))}
        staff={staff}
      />
    </div>
  );
}
