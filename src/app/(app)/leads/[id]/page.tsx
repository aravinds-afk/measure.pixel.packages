import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Building2, Briefcase, User as UserIcon, Tag } from "lucide-react";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import ConvertButton from "./convert-button";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true } },
      campaign: { select: { name: true } },
      calls: { orderBy: { createdAt: "desc" } },
      emails: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { scheduledAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
    },
  });
  if (!lead) notFound();

  return (
    <div>
      <PageHeader
        title={lead.name}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Leads", href: "/leads" }, { label: lead.name }]}
        actions={lead.status !== "WON" && lead.status !== "LOST" ? <ConvertButton id={lead.id} /> : undefined}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="h-fit">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={lead.status} />
              <StatusBadge status={lead.priority} />
            </div>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(lead.value)}</p>
            <div className="space-y-2.5 text-sm border-t border-border pt-4">
              <div className="flex items-center gap-2.5 text-muted"><Mail className="size-4" /><span className="text-foreground">{lead.email}</span></div>
              <div className="flex items-center gap-2.5 text-muted"><Phone className="size-4" /><span className="text-foreground">{lead.phone}</span></div>
              {lead.company && <div className="flex items-center gap-2.5 text-muted"><Building2 className="size-4" /><span className="text-foreground">{lead.company}</span></div>}
              {lead.industry && <div className="flex items-center gap-2.5 text-muted"><Briefcase className="size-4" /><span className="text-foreground">{lead.industry}</span></div>}
              <div className="flex items-center gap-2.5 text-muted"><Tag className="size-4" /><span className="text-foreground">{lead.source}{lead.campaign ? ` · ${lead.campaign.name}` : ""}</span></div>
              <div className="flex items-center gap-2.5 text-muted"><UserIcon className="size-4" /><span className="text-foreground">{lead.assignedTo?.name ?? "Unassigned"}</span></div>
            </div>
            <div className="border-t border-border pt-4 text-xs text-muted">
              <p>Created {formatDate(lead.createdAt)}</p>
              {lead.nextFollowUp && <p className="mt-1">Next follow-up {formatDate(lead.nextFollowUp)}</p>}
            </div>
            {lead.notes && <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted">{lead.notes}</div>}
            <Link href="/leads"><Button variant="outline" className="w-full">Back to leads</Button></Link>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Follow-ups</p>
              {lead.followUps.length === 0 ? <EmptyState title="No follow-ups scheduled" /> : (
                <div className="space-y-2">
                  {lead.followUps.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <div><p className="font-medium text-foreground">{f.type.replace(/_/g, " ")}</p><p className="text-xs text-muted">{f.notes}</p></div>
                      <StatusBadge status={f.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Calls & Emails</p>
              {lead.calls.length === 0 && lead.emails.length === 0 ? <EmptyState title="No communication logged" /> : (
                <div className="space-y-2">
                  {lead.calls.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <div><p className="font-medium text-foreground">Call · {c.outcome.replace(/_/g, " ")}</p><p className="text-xs text-muted">{c.notes}</p></div>
                      <p className="text-xs text-muted">{timeAgo(c.createdAt)}</p>
                    </div>
                  ))}
                  {lead.emails.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <div><p className="font-medium text-foreground">{e.subject}</p><p className="text-xs text-muted">{e.direction}</p></div>
                      <p className="text-xs text-muted">{timeAgo(e.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Activity timeline</p>
              {lead.activities.length === 0 ? <EmptyState title="No activity yet" /> : (
                <div className="space-y-4">
                  {lead.activities.map((a) => (
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
