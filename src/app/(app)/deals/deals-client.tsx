"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteDealAction } from "@/actions/deals";
import DealFormModal from "./deal-form-modal";

type Deal = {
  id: string; name: string; value: number; probability: number; stage: string; expectedClose: string | null;
  createdAt: string; notes: string | null; customerId: string | null; leadId: string | null;
  customer: { id: string; name: string } | null; assignedTo: { id: string; name: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };
type Customer = { id: string; name: string };

export default function DealsClient({ initialDeals, staff, customers }: { initialDeals: Deal[]; staff: Staff[]; customers: Customer[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => { if (params.get("new") === "1") { setEditing(null); setFormOpen(true); } }, [params]);
  function closeForm() { setFormOpen(false); if (params.get("new")) router.replace("/deals"); }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteDealAction(deleteTarget.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not delete", description: res.error }); return; }
      toast({ kind: "success", title: "Deal deleted" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const columns: Column<Deal>[] = [
    { key: "name", header: "Deal", sortable: true, render: (d) => (<div><p className="font-medium text-foreground">{d.name}</p><p className="text-xs text-muted">{d.customer?.name ?? "—"}</p></div>) },
    { key: "value", header: "Value", sortable: true, render: (d) => formatCurrency(d.value), exportValue: (d) => String(d.value) },
    { key: "probability", header: "Probability", render: (d) => `${d.probability}%` },
    { key: "stage", header: "Stage", sortable: true, render: (d) => <StatusBadge status={d.stage} />, exportValue: (d) => d.stage },
    { key: "expectedClose", header: "Expected Close", render: (d) => d.expectedClose ? formatDate(d.expectedClose) : "—", hideOnMobile: true },
    { key: "assignedTo", header: "Owner", render: (d) => d.assignedTo?.name ?? "Unassigned" },
  ];

  return (
    <div>
      <DataTable
        data={initialDeals}
        columns={columns}
        getId={(d) => d.id}
        searchPlaceholder="Search deals..."
        searchFn={(d, q) => [d.name, d.customer?.name].join(" ").toLowerCase().includes(q.toLowerCase())}
        exportName="deals"
        emptyTitle="No deals yet"
        emptyDescription="Create a deal to begin tracking pipeline value."
        onRowClick={(d) => router.push(`/deals/${d.id}`)}
        filters={<Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> Add Deal</Button>}
        rowActions={(d) => (
          <Dropdown>
            <DropdownTrigger asChild><button className="rounded-md p-1.5 hover:bg-surface-2 text-muted"><MoreHorizontal className="size-4" /></button></DropdownTrigger>
            <DropdownContent>
              <DropdownItem onSelect={() => { setEditing(d); setFormOpen(true); }}><Pencil className="size-4 text-muted" /> Edit</DropdownItem>
              <DropdownItem onSelect={() => setDeleteTarget(d)} className="text-danger hover:bg-danger-soft"><Trash2 className="size-4" /> Delete</DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      />

      <DealFormModal open={formOpen} onOpenChange={(o) => (o ? setFormOpen(true) : closeForm())} staff={staff} customers={customers} deal={editing} onSuccess={() => { closeForm(); router.refresh(); }} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete deal"
        description={`This will permanently delete ${deleteTarget?.name ?? "this deal"}.`}
        confirmLabel="Delete deal"
        danger
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
