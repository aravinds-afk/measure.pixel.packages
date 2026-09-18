import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { Wallet, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import InvoicesClient from "./invoices-client";

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [invoices, customers] = await Promise.all([
    prisma.invoice.findMany({
      include: { customer: { select: { id: true, name: true } }, items: true, payments: true },
      orderBy: { issueDate: "desc" },
    }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const withTotals = invoices.map((i) => ({
    ...i,
    total: i.items.reduce((s, it) => s + it.price * it.quantity, 0) * (1 + i.tax / 100) * (1 - i.discount / 100),
    paid: i.payments.reduce((s, p) => s + p.amount, 0),
  }));

  const totalRevenue = withTotals.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const paidCount = withTotals.filter((i) => i.status === "PAID").length;
  const pendingCount = withTotals.filter((i) => i.status === "SENT" || i.status === "PARTIALLY_PAID").length;
  const overdueCount = withTotals.filter((i) => i.status === "OVERDUE").length;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create, send and track invoices."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Invoices" }]}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={Wallet} tone="success" />
        <StatCard label="Paid Invoices" value={paidCount} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending Invoices" value={pendingCount} icon={Clock} tone="warning" />
        <StatCard label="Overdue Invoices" value={overdueCount} icon={AlertTriangle} tone="danger" />
      </div>
      <InvoicesClient
        initialInvoices={withTotals.map((i) => ({ ...i, issueDate: i.issueDate.toISOString(), dueDate: i.dueDate.toISOString() }))}
        customers={customers}
      />
    </div>
  );
}
