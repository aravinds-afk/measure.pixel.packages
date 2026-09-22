import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { Building2, Mail, Phone, MapPin, Briefcase, User as UserIcon } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import CustomerProfileTabs from "./profile-tabs";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, designation: true } },
      leads: { orderBy: { createdAt: "desc" } },
      deals: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      calls: { orderBy: { createdAt: "desc" } },
      emails: { orderBy: { createdAt: "desc" } },
      invoices: { include: { items: true, payments: true }, orderBy: { issueDate: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      followUps: { orderBy: { scheduledAt: "desc" } },
    },
  });

  if (!customer) notFound();

  const totalRevenue = customer.deals.filter((d) => d.stage === "WON").reduce((s, d) => s + d.value, 0);
  const pendingTasks = customer.tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;

  return (
    <div>
      <PageHeader
        title={customer.name}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Customers", href: "/customers" }, { label: customer.name }]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={customer.name} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{customer.name}</p>
                <p className="text-sm text-muted truncate">{customer.company ?? "Individual"}</p>
              </div>
            </div>
            <div className="mt-4"><StatusBadge status={customer.status} /></div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-muted"><Mail className="size-4" /> <span className="text-foreground">{customer.email}</span></div>
              <div className="flex items-center gap-2.5 text-muted"><Phone className="size-4" /> <span className="text-foreground">{customer.phone}</span></div>
              {customer.company && <div className="flex items-center gap-2.5 text-muted"><Building2 className="size-4" /> <span className="text-foreground">{customer.company}</span></div>}
              {customer.industry && <div className="flex items-center gap-2.5 text-muted"><Briefcase className="size-4" /> <span className="text-foreground">{customer.industry}</span></div>}
              {customer.address && <div className="flex items-center gap-2.5 text-muted"><MapPin className="size-4" /> <span className="text-foreground">{customer.address}</span></div>}
              <div className="flex items-center gap-2.5 text-muted"><UserIcon className="size-4" /> <span className="text-foreground">{customer.assignedTo?.name ?? "Unassigned"}</span></div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted">Total Revenue</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Open Tasks</p>
                <p className="text-lg font-semibold text-foreground">{pendingTasks}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Customer Since</p>
                <p className="text-sm font-medium text-foreground">{formatDate(customer.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Last Contact</p>
                <p className="text-sm font-medium text-foreground">{customer.lastContact ? formatDate(customer.lastContact) : "—"}</p>
              </div>
            </div>
            {customer.notes && (
              <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs text-muted">{customer.notes}</div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <CustomerProfileTabs
            customer={{
              deals: customer.deals.map((d) => ({ ...d, createdAt: d.createdAt.toISOString(), expectedClose: d.expectedClose?.toISOString() ?? null })),
              leads: customer.leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
              tasks: customer.tasks.map((t) => ({ ...t, dueDate: t.dueDate?.toISOString() ?? null })),
              calls: customer.calls.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
              emails: customer.emails.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
              invoices: customer.invoices.map((i) => ({
                ...i,
                issueDate: i.issueDate.toISOString(),
                dueDate: i.dueDate.toISOString(),
                total: i.items.reduce((s, it) => s + it.price * it.quantity, 0) * (1 + i.tax / 100) * (1 - i.discount / 100),
              })),
              documents: customer.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
              activities: customer.activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), user: a.user })),
              followUps: customer.followUps.map((f) => ({ ...f, scheduledAt: f.scheduledAt.toISOString() })),
            }}
          />
        </div>
      </div>
    </div>
  );
}
