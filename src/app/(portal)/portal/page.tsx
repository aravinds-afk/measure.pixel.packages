import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPortalCustomer } from "@/lib/data/portal";
import { PageHeader } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Handshake, Receipt, Wallet, LifeBuoy } from "lucide-react";

export default async function PortalDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const customer = await getPortalCustomer(session);

  const [deals, invoices, payments] = await Promise.all([
    prisma.deal.findMany({ where: { customerId: customer.id } }),
    prisma.invoice.findMany({ where: { customerId: customer.id }, include: { items: true, payments: true } }),
    prisma.payment.findMany({ where: { customerId: customer.id }, orderBy: { paidAt: "desc" }, take: 5 }),
  ]);

  const totalSpent = payments.reduce((s, p) => s + p.amount, 0);
  const outstandingInvoices = invoices.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED");

  return (
    <div>
      <PageHeader title={`Welcome back, ${session.name.split(" ")[0]}`} description="Your account overview with Measure Pixel." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard label="Active Deals" value={deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST").length} icon={Handshake} tone="brand" />
        <StatCard label="Total Invoices" value={invoices.length} icon={Receipt} tone="info" />
        <StatCard label="Total Paid" value={formatCurrency(totalSpent)} icon={Wallet} tone="success" />
        <StatCard label="Outstanding" value={outstandingInvoices.length} icon={LifeBuoy} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Recent invoices</p>
            {invoices.length === 0 ? <p className="text-sm text-muted">No invoices yet.</p> : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div><p className="font-medium text-foreground">{i.number}</p><p className="text-xs text-muted">Due {formatDate(i.dueDate)}</p></div>
                    <StatusBadge status={i.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Recent payments</p>
            {payments.length === 0 ? <p className="text-sm text-muted">No payments yet.</p> : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div><p className="font-medium text-foreground">{formatCurrency(p.amount)}</p><p className="text-xs text-muted">{p.method}</p></div>
                    <p className="text-xs text-muted">{formatDate(p.paidAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
