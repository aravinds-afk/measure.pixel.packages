import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPortalCustomer } from "@/lib/data/portal";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt } from "lucide-react";

export default async function PortalInvoicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const customer = await getPortalCustomer(session);
  const invoices = await prisma.invoice.findMany({ where: { customerId: customer.id }, include: { items: true }, orderBy: { issueDate: "desc" } });

  return (
    <div>
      <PageHeader title="Invoices" description="View and download your invoices." />
      {invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" />
      ) : (
        <div className="space-y-3">
          {invoices.map((i) => {
            const total = i.items.reduce((s, it) => s + it.price * it.quantity, 0) * (1 + i.tax / 100) * (1 - i.discount / 100);
            return (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-foreground">{i.number}</p><p className="text-xs text-muted">Issued {formatDate(i.issueDate)} · Due {formatDate(i.dueDate)}</p></div>
                  <div className="text-right"><p className="font-semibold text-foreground">{formatCurrency(total)}</p><StatusBadge status={i.status} /></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
