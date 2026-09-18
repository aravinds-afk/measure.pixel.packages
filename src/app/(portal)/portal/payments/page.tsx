import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPortalCustomer } from "@/lib/data/portal";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Wallet } from "lucide-react";

export default async function PortalPaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const customer = await getPortalCustomer(session);
  const payments = await prisma.payment.findMany({ where: { customerId: customer.id }, include: { invoice: { select: { number: true } } }, orderBy: { paidAt: "desc" } });

  return (
    <div>
      <PageHeader title="Payments" description="Your complete payment history." />
      {payments.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments yet" />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">{p.invoice.number}</p><p className="text-xs text-muted">{p.method} · {formatDateTime(p.paidAt)}</p></div>
                <div className="text-right"><p className="font-semibold text-foreground">{formatCurrency(p.amount)}</p><StatusBadge status={p.status} /></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
