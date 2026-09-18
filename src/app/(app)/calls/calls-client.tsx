"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { deleteCallAction } from "@/actions/calls";
import CallFormModal from "./call-form-modal";

type Call = {
  id: string; phone: string; direction: string; duration: number; outcome: string; notes: string | null;
  createdAt: string; customer: { id: string; name: string } | null; lead: { id: string; name: string } | null; employee: { name: string } | null;
};
type Customer = { id: string; name: string; phone: string };
type Lead = { id: string; name: string; phone: string };

const DIRECTION_ICON: Record<string, typeof PhoneIncoming> = { INCOMING: PhoneIncoming, OUTGOING: PhoneOutgoing, MISSED: PhoneMissed };

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function CallsClient({ initialCalls, customers, leads }: { initialCalls: Call[]; customers: Customer[]; leads: Lead[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Call | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteCallAction(deleteTarget.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not delete", description: res.error }); return; }
      toast({ kind: "success", title: "Call log removed" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const columns: Column<Call>[] = [
    {
      key: "phone", header: "Contact",
      render: (c) => {
        const Icon = DIRECTION_ICON[c.direction];
        return (
          <div className="flex items-center gap-2.5">
            <Icon className="size-4 text-muted" />
            <div><p className="font-medium text-foreground">{c.customer?.name ?? c.lead?.name ?? c.phone}</p><p className="text-xs text-muted">{c.phone}</p></div>
          </div>
        );
      },
    },
    { key: "duration", header: "Duration", render: (c) => formatDuration(c.duration) },
    { key: "outcome", header: "Outcome", sortable: true, render: (c) => <StatusBadge status={c.outcome} />, exportValue: (c) => c.outcome },
    { key: "employee", header: "Logged by", render: (c) => c.employee?.name ?? "—", hideOnMobile: true },
    { key: "createdAt", header: "Date", sortable: true, render: (c) => formatDateTime(c.createdAt) },
  ];

  return (
    <div>
      <DataTable
        data={initialCalls}
        columns={columns}
        getId={(c) => c.id}
        searchPlaceholder="Search calls..."
        searchFn={(c, q) => [c.customer?.name, c.lead?.name, c.phone, c.notes].join(" ").toLowerCase().includes(q.toLowerCase())}
        exportName="calls"
        emptyTitle="No calls logged"
        emptyDescription="Log your first call to start tracking outreach."
        filters={<Button size="sm" onClick={() => setFormOpen(true)}><Plus className="size-3.5" /> Log Call</Button>}
        rowActions={(c) => (
          <button onClick={() => setDeleteTarget(c)} className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-4" /></button>
        )}
      />

      <CallFormModal open={formOpen} onOpenChange={setFormOpen} customers={customers} leads={leads} onSuccess={() => { setFormOpen(false); router.refresh(); }} />

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete call log" description="This will remove this call record permanently." confirmLabel="Delete" danger pending={pending} onConfirm={handleDelete} />
    </div>
  );
}
