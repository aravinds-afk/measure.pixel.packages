"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, MoreHorizontal, Pencil, Trash2, Plus, ArrowRightLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { deleteLeadAction, convertLeadToCustomerAction } from "@/actions/leads";
import LeadFormModal from "./lead-form-modal";
import LeadsKanban from "./leads-kanban";

type Lead = {
  id: string; name: string; company: string | null; email: string; phone: string; source: string;
  industry: string | null; value: number; status: string; priority: string; notes: string | null;
  nextFollowUp: string | null; createdAt: string; assignedTo: { id: string; name: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };

export default function LeadsClient({ initialLeads, staff }: { initialLeads: Lead[]; staff: Staff[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (params.get("new") === "1") { setEditing(null); setFormOpen(true); }
  }, [params]);

  function closeForm() {
    setFormOpen(false);
    if (params.get("new")) router.replace("/leads");
  }

  function handleConvert(lead: Lead) {
    startTransition(async () => {
      const res = await convertLeadToCustomerAction(lead.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not convert lead", description: res.error }); return; }
      toast({ kind: "success", title: "Lead converted to customer" });
      router.push(`/customers/${res.data!.customerId}`);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteLeadAction(deleteTarget.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not delete", description: res.error }); return; }
      toast({ kind: "success", title: "Lead deleted" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const columns: Column<Lead>[] = [
    { key: "name", header: "Lead", sortable: true, render: (l) => (<div><p className="font-medium text-foreground">{l.name}</p><p className="text-xs text-muted">{l.company ?? "—"}</p></div>) },
    { key: "source", header: "Source", render: (l) => l.source, hideOnMobile: true },
    { key: "value", header: "Value", sortable: true, render: (l) => formatCurrency(l.value), exportValue: (l) => String(l.value) },
    { key: "status", header: "Status", sortable: true, render: (l) => <StatusBadge status={l.status} />, exportValue: (l) => l.status },
    { key: "priority", header: "Priority", render: (l) => <StatusBadge status={l.priority} />, exportValue: (l) => l.priority, hideOnMobile: true },
    { key: "assignedTo", header: "Assigned", render: (l) => l.assignedTo?.name ?? "Unassigned", exportValue: (l) => l.assignedTo?.name ?? "" },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1 rounded-lg bg-surface-2 p-1 w-fit ml-auto">
        <button onClick={() => setView("table")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === "table" ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}>
          <List className="size-3.5" /> Table
        </button>
        <button onClick={() => setView("kanban")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === "kanban" ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}>
          <LayoutGrid className="size-3.5" /> Kanban
        </button>
      </div>

      {view === "table" ? (
        <DataTable
          data={initialLeads}
          columns={columns}
          getId={(l) => l.id}
          searchPlaceholder="Search leads..."
          searchFn={(l, q) => [l.name, l.company, l.email].join(" ").toLowerCase().includes(q.toLowerCase())}
          exportName="leads"
          emptyTitle="No leads yet"
          emptyDescription="Add your first lead to start filling your pipeline."
          onRowClick={(l) => router.push(`/leads/${l.id}`)}
          filters={<Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> Add Lead</Button>}
          rowActions={(l) => (
            <Dropdown>
              <DropdownTrigger asChild><button className="rounded-md p-1.5 hover:bg-surface-2 text-muted"><MoreHorizontal className="size-4" /></button></DropdownTrigger>
              <DropdownContent>
                <DropdownItem onSelect={() => { setEditing(l); setFormOpen(true); }}><Pencil className="size-4 text-muted" /> Edit</DropdownItem>
                {l.status !== "WON" && l.status !== "LOST" && (
                  <DropdownItem onSelect={() => handleConvert(l)}><ArrowRightLeft className="size-4 text-muted" /> Convert to customer</DropdownItem>
                )}
                <DropdownItem onSelect={() => setDeleteTarget(l)} className="text-danger hover:bg-danger-soft"><Trash2 className="size-4" /> Delete</DropdownItem>
              </DropdownContent>
            </Dropdown>
          )}
        />
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> Add Lead</Button>
          </div>
          <LeadsKanban leads={initialLeads} onOpenLead={(l) => router.push(`/leads/${l.id}`)} />
        </>
      )}

      <LeadFormModal open={formOpen} onOpenChange={(o) => (o ? setFormOpen(true) : closeForm())} staff={staff} lead={editing} onSuccess={() => { closeForm(); router.refresh(); }} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete lead"
        description={`This will permanently delete ${deleteTarget?.name ?? "this lead"}.`}
        confirmLabel="Delete lead"
        danger
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
