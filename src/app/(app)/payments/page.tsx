import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { Wallet, TrendingUp, Receipt, Calendar as CalendarIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { startOfMonth } from "date-fns";
import PaymentsClient from "./payments-client";

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const payments = await prisma.payment.findMany({
    include: { customer: { select: { id: true, name: true } }, invoice: { select: { number: true } } },
    orderBy: { paidAt: "desc" },
  });

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const thisMonth = payments.filter((p) => p.paidAt >= startOfMonth(new Date())).reduce((s, p) => s + p.amount, 0);
  const avgPayment = payments.length > 0 ? totalCollected / payments.length : 0;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="All payments received across every invoice."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Payments" }]}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard label="Total Collected" value={formatCurrency(totalCollected)} icon={Wallet} tone="success" />
        <StatCard label="Collected This Month" value={formatCurrency(thisMonth)} icon={CalendarIcon} tone="brand" />
        <StatCard label="Average Payment" value={formatCurrency(avgPayment)} icon={TrendingUp} tone="info" />
        <StatCard label="Total Payments" value={payments.length} icon={Receipt} tone="warning" />
      </div>
      <PaymentsClient
        initialPayments={payments.map((p) => ({ ...p, paidAt: p.paidAt.toISOString() }))}
      />
    </div>
  );
}
