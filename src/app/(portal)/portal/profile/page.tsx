import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPortalCustomer } from "@/lib/data/portal";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Mail, Phone, Building2, MapPin } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default async function PortalProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const customer = await getPortalCustomer(session);

  const [calls, emails] = await Promise.all([
    prisma.call.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.email.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div>
      <PageHeader title="My Profile" description="Your account details on file with Measure Pixel." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="h-fit">
          <CardContent className="p-6 text-center">
            <Avatar name={customer.name} size="lg" className="mx-auto" />
            <p className="mt-3 font-semibold text-foreground">{customer.name}</p>
            <p className="text-sm text-muted">{customer.company}</p>
            <div className="mt-3"><StatusBadge status={customer.status} /></div>
            <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-left text-sm">
              <div className="flex items-center gap-2.5 text-muted"><Mail className="size-4" /><span className="text-foreground truncate">{customer.email}</span></div>
              <div className="flex items-center gap-2.5 text-muted"><Phone className="size-4" /><span className="text-foreground">{customer.phone}</span></div>
              {customer.company && <div className="flex items-center gap-2.5 text-muted"><Building2 className="size-4" /><span className="text-foreground">{customer.company}</span></div>}
              {customer.address && <div className="flex items-center gap-2.5 text-muted"><MapPin className="size-4" /><span className="text-foreground">{customer.address}</span></div>}
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Communication history</p>
              {calls.length === 0 && emails.length === 0 ? (
                <EmptyState title="No communication yet" />
              ) : (
                <div className="space-y-2">
                  {calls.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <div><p className="font-medium text-foreground">Call · {c.outcome.replace(/_/g, " ")}</p><p className="text-xs text-muted">{c.notes}</p></div>
                      <p className="text-xs text-muted">{timeAgo(c.createdAt)}</p>
                    </div>
                  ))}
                  {emails.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <div><p className="font-medium text-foreground">{e.subject}</p><p className="text-xs text-muted">{e.direction}</p></div>
                      <p className="text-xs text-muted">{timeAgo(e.createdAt)}</p>
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
