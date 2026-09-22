"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import ComposeModal from "./compose-modal";

type Email = {
  id: string; subject: string; body: string; direction: string; status: string; createdAt: string;
  customer: { id: string; name: string } | null; lead: { id: string; name: string } | null; employee: { name: string } | null;
};
type Customer = { id: string; name: string };
type Lead = { id: string; name: string };

export default function EmailsClient({ initialEmails, customers, leads }: { initialEmails: Email[]; customers: Customer[]; leads: Lead[] }) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);

  const sent = initialEmails.filter((e) => e.direction === "SENT");
  const received = initialEmails.filter((e) => e.direction === "RECEIVED");

  function EmailList({ list }: { list: Email[] }) {
    if (list.length === 0) return <EmptyState icon={Paperclip} title="No emails here" description="Your email history will appear here." />;
    return (
      <div className="space-y-2">
        {list.map((e) => (
          <div key={e.id} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{e.subject}</p>
                <p className="text-xs text-muted mt-0.5">{e.customer?.name ?? e.lead?.name ?? "Unlinked"} · {e.employee?.name ?? "System"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={e.status} />
                <span className="text-xs text-muted whitespace-nowrap">{formatDateTime(e.createdAt)}</span>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted whitespace-pre-line">{e.body}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setComposeOpen(true)}><Pencil className="size-3.5" /> Compose</Button>
      </div>
      <Tabs defaultValue="sent">
        <TabsList>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
          <TabsTrigger value="all">All ({initialEmails.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="sent"><EmailList list={sent} /></TabsContent>
        <TabsContent value="received"><EmailList list={received} /></TabsContent>
        <TabsContent value="all"><EmailList list={initialEmails} /></TabsContent>
      </Tabs>

      <ComposeModal open={composeOpen} onOpenChange={setComposeOpen} customers={customers} leads={leads} onSuccess={() => { setComposeOpen(false); router.refresh(); }} />
    </div>
  );
}
