import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { Handshake, User as UserIcon, Calendar as CalendarIcon } from "lucide-react";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      assignedTo: { select: { name: true } },
      invoices: true,
      activities: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
    },
  });
  if (!deal) notFound();

  return (
    <div>
      <PageHeader
        title={deal.name}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Deals", href: "/deals" }, { label: deal.name }]}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="h-fit">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={deal.stage} />
              <span className="text-xs text-muted">{deal.probability}% probability</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(deal.value)}</p>
            <div className="space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex items-center gap-2.5 text-muted"><Handshake className="size-4" /><span className="text-foreground">{deal.customer?.name ?? deal.lead?.name ?? "No linked account"}</span></div>
              <div className="flex items-center gap-2.5 text-muted"><UserIcon className="size-4" /><span className="text-foreground">{deal.assignedTo?.name ?? "Unassigned"}</span></div>
              {deal.expectedClose && <div className="flex items-center gap-2.5 text-muted"><CalendarIcon className="size-4" /><span className="text-foreground">Expected close {formatDate(deal.expectedClose)}</span></div>}
            </div>
            {deal.notes && <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted">{deal.notes}</div>}
            {deal.lostReason && <div className="rounded-lg bg-danger-soft p-3 text-xs text-danger">Lost reason: {deal.lostReason}</div>}
            {deal.customer && <Link href={`/customers/${deal.customer.id}`}><Button variant="outline" className="w-full">View customer</Button></Link>}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Linked invoices</p>
              {deal.invoices.length === 0 ? <EmptyState title="No invoices for this deal" /> : (
                <div className="space-y-2">
                  {deal.invoices.map((i) => (
                    <div key={i.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium text-foreground">{i.number}</p>
                      <StatusBadge status={i.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Activity timeline</p>
              {deal.activities.length === 0 ? <EmptyState title="No activity yet" /> : (
                <div className="space-y-4">
                  {deal.activities.map((a) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
                      <div><p className="text-sm text-foreground"><span className="font-medium">{a.user?.name ?? "System"}</span> {a.description}</p><p className="text-xs text-muted">{timeAgo(a.createdAt)}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
