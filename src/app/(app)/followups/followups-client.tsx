"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, cn } from "@/lib/utils";
import { completeFollowUpAction, deleteFollowUpAction } from "@/actions/followups";
import FollowUpFormModal from "./followup-form-modal";

type FollowUp = {
  id: string; type: string; status: string; notes: string | null; scheduledAt: string; reminder: boolean;
  customer: { id: string; name: string } | null; lead: { id: string; name: string } | null; assignedTo: { id: string; name: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };
type Customer = { id: string; name: string };
type Lead = { id: string; name: string };

export default function FollowUpsClient({ initialFollowUps, staff, customers, leads }: { initialFollowUps: FollowUp[]; staff: Staff[]; customers: Customer[]; leads: Lead[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FollowUp | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => { if (params.get("new") === "1") { setEditing(null); setFormOpen(true); } }, [params]);
  function closeForm() { setFormOpen(false); if (params.get("new")) router.replace("/followups"); }

  const overdueCount = initialFollowUps.filter((f) => f.status === "OVERDUE").length;

  function handleComplete(f: FollowUp) {
    startTransition(async () => {
      const res = await completeFollowUpAction(f.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not update", description: res.error }); return; }
      toast({ kind: "success", title: "Follow-up completed" });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteFollowUpAction(deleteTarget.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not delete", description: res.error }); return; }
      toast({ kind: "success", title: "Follow-up removed" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const columns: Column<FollowUp>[] = [
    {
      key: "type", header: "Follow-up", sortable: true,
      render: (f) => (
        <div className="flex items-center gap-2">
          {f.status === "OVERDUE" && <AlertTriangle className="size-3.5 text-danger" />}
          <div><p className="font-medium text-foreground">{f.type.replace(/_/g, " ")}</p><p className="text-xs text-muted">{f.customer?.name ?? f.lead?.name ?? "—"}</p></div>
        </div>
      ),
    },
    { key: "scheduledAt", header: "Scheduled", sortable: true, render: (f) => formatDateTime(f.scheduledAt) },
    { key: "status", header: "Status", render: (f) => <StatusBadge status={f.status} />, exportValue: (f) => f.status },
    { key: "assignedTo", header: "Assigned", render: (f) => f.assignedTo?.name ?? "Unassigned", hideOnMobile: true },
  ];

  return (
    <div>
      {overdueCount > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          <AlertTriangle className="size-4" /> You have {overdueCount} overdue follow-up{overdueCount > 1 ? "s" : ""} that need attention.
        </div>
      )}
      <DataTable
        data={initialFollowUps}
        columns={columns}
        getId={(f) => f.id}
        searchPlaceholder="Search follow-ups..."
        searchFn={(f, q) => [f.type, f.customer?.name, f.lead?.name, f.notes].join(" ").toLowerCase().includes(q.toLowerCase())}
        exportName="followups"
        emptyTitle="No follow-ups scheduled"
        emptyDescription="Schedule a follow-up to keep your relationships warm."
        filters={<Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> Schedule Follow-up</Button>}
        rowActions={(f) => (
          <Dropdown>
            <DropdownTrigger asChild><button className={cn("rounded-md p-1.5 hover:bg-surface-2 text-muted")}><MoreHorizontal className="size-4" /></button></DropdownTrigger>
            <DropdownContent>
              {f.status !== "COMPLETED" && <DropdownItem onSelect={() => handleComplete(f)}><CheckCircle2 className="size-4 text-muted" /> Mark complete</DropdownItem>}
              <DropdownItem onSelect={() => { setEditing(f); setFormOpen(true); }}><Pencil className="size-4 text-muted" /> Edit</DropdownItem>
              <DropdownItem onSelect={() => setDeleteTarget(f)} className="text-danger hover:bg-danger-soft"><Trash2 className="size-4" /> Delete</DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      />

      <FollowUpFormModal open={formOpen} onOpenChange={(o) => (o ? setFormOpen(true) : closeForm())} staff={staff} customers={customers} leads={leads} followUp={editing} onSuccess={() => { closeForm(); router.refresh(); }} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete follow-up"
        description="This will permanently remove this scheduled follow-up."
        confirmLabel="Delete"
        danger
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
