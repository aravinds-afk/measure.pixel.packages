import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPortalCustomer } from "@/lib/data/portal";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";

export default async function PortalDocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const customer = await getPortalCustomer(session);
  const documents = await prisma.document.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader title="Documents" description="Contracts, invoices and files shared with you." />
      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents shared yet" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {documents.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand"><FileText className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted">{formatDate(d.createdAt)}</p>
                </div>
              </div>
              <Badge tone="neutral" className="mt-3">{d.category}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
