"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatCurrency, formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import { Phone, Mail, FileText, CheckSquare, Handshake, Target, Inbox, Receipt, Clock } from "lucide-react";

type Props = {
  customer: {
    deals: { id: string; name: string; value: number; stage: string; probability: number; createdAt: string; expectedClose: string | null }[];
    leads: { id: string; name: string; status: string; value: number; source: string; createdAt: string }[];
    tasks: { id: string; title: string; status: string; priority: string; dueDate: string | null }[];
    calls: { id: string; direction: string; outcome: string; duration: number; notes: string | null; createdAt: string }[];
    emails: { id: string; subject: string; direction: string; status: string; createdAt: string }[];
    invoices: { id: string; number: string; status: string; total: number; issueDate: string; dueDate: string }[];
    documents: { id: string; name: string; category: string; createdAt: string }[];
    activities: { id: string; description: string; module: string; createdAt: string; user: { name: string } | null }[];
    followUps: { id: string; type: string; status: string; scheduledAt: string; notes: string | null }[];
  };
};

export default function CustomerProfileTabs({ customer }: Props) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="communication">Communication</TabsTrigger>
        <TabsTrigger value="sales">Sales</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="timeline">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-muted">Deals</p><p className="text-xl font-semibold text-foreground">{customer.deals.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Leads</p><p className="text-xl font-semibold text-foreground">{customer.leads.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Invoices</p><p className="text-xl font-semibold text-foreground">{customer.invoices.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Follow-ups</p><p className="text-xl font-semibold text-foreground">{customer.followUps.length}</p></Card>
        </div>
        <Card className="mt-4">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground mb-3">Upcoming follow-ups</p>
            {customer.followUps.filter((f) => f.status === "PENDING").length === 0 ? (
              <EmptyState icon={Clock} title="No follow-ups scheduled" description="Schedule a follow-up to stay on top of this account." />
            ) : (
              <div className="space-y-2">
                {customer.followUps.filter((f) => f.status === "PENDING").slice(0, 5).map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{f.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted">{f.notes}</p>
                    </div>
                    <p className="text-xs text-muted">{formatDateTime(f.scheduledAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="communication">
        <div className="space-y-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Phone className="size-4" /> Calls</p>
            {customer.calls.length === 0 ? <EmptyState title="No calls logged" /> : (
              <div className="space-y-2">
                {customer.calls.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div><p className="font-medium text-foreground">{c.direction} · {c.outcome.replace(/_/g, " ")}</p><p className="text-xs text-muted">{c.notes}</p></div>
                    <p className="text-xs text-muted">{timeAgo(c.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Mail className="size-4" /> Emails</p>
            {customer.emails.length === 0 ? <EmptyState title="No emails yet" /> : (
              <div className="space-y-2">
                {customer.emails.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div><p className="font-medium text-foreground">{e.subject}</p><p className="text-xs text-muted">{e.direction} · {e.status}</p></div>
                    <p className="text-xs text-muted">{timeAgo(e.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="sales">
        <div className="space-y-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Handshake className="size-4" /> Deals</p>
            {customer.deals.length === 0 ? <EmptyState title="No deals yet" icon={Handshake} /> : (
              <div className="space-y-2">
                {customer.deals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div><p className="font-medium text-foreground">{d.name}</p><p className="text-xs text-muted">{formatCurrency(d.value)} · {d.probability}% probability</p></div>
                    <StatusBadge status={d.stage} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Target className="size-4" /> Leads</p>
            {customer.leads.length === 0 ? <EmptyState title="No leads linked" icon={Target} /> : (
              <div className="space-y-2">
                {customer.leads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div><p className="font-medium text-foreground">{l.name}</p><p className="text-xs text-muted">{formatCurrency(l.value)} · {l.source}</p></div>
                    <StatusBadge status={l.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Receipt className="size-4" /> Invoices</p>
            {customer.invoices.length === 0 ? <EmptyState title="No invoices yet" icon={Receipt} /> : (
              <div className="space-y-2">
                {customer.invoices.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div><p className="font-medium text-foreground">{i.number}</p><p className="text-xs text-muted">{formatCurrency(i.total)} · Due {formatDate(i.dueDate)}</p></div>
                    <StatusBadge status={i.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="tasks">
        {customer.tasks.length === 0 ? <EmptyState title="No tasks yet" icon={CheckSquare} /> : (
          <div className="space-y-2">
            {customer.tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div><p className="font-medium text-foreground">{t.title}</p><p className="text-xs text-muted">{t.dueDate ? formatDate(t.dueDate) : "No due date"}</p></div>
                <div className="flex gap-2"><StatusBadge status={t.priority} /><StatusBadge status={t.status} /></div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="documents">
        {customer.documents.length === 0 ? <EmptyState title="No documents uploaded" icon={FileText} /> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {customer.documents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <FileText className="size-4 text-brand" />
                <div className="min-w-0 flex-1"><p className="truncate font-medium text-foreground">{d.name}</p><p className="text-xs text-muted">{d.category} · {formatDate(d.createdAt)}</p></div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="timeline">
        {customer.activities.length === 0 ? <EmptyState title="No activity yet" icon={Inbox} /> : (
          <div className="space-y-4">
            {customer.activities.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
                <div><p className="text-sm text-foreground"><span className="font-medium">{a.user?.name ?? "System"}</span> {a.description}</p><p className="text-xs text-muted">{a.module} · {timeAgo(a.createdAt)}</p></div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
