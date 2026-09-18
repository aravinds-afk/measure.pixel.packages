import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPortalCustomer } from "@/lib/data/portal";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Handshake } from "lucide-react";

export default async function PortalOrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const customer = await getPortalCustomer(session);
  const deals = await prisma.deal.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader title="Orders & Deals" description="Every engagement you have with Measure Pixel." />
      {deals.length === 0 ? (
        <EmptyState icon={Handshake} title="No orders yet" description="Your active and past deals will appear here." />
      ) : (
        <div className="space-y-3">
          {deals.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">{d.name}</p><p className="text-xs text-muted">{formatCurrency(d.value)} · Expected {d.expectedClose ? formatDate(d.expectedClose) : "TBD"}</p></div>
                <StatusBadge status={d.stage} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
