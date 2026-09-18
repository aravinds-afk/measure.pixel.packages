"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Plus, Eye } from "lucide-react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteInvoiceAction } from "@/actions/invoices";
import InvoiceFormModal from "./invoice-form-modal";

type Invoice = {
  id: string; number: string; status: string; tax: number; discount: number; total: number; paid: number;
  issueDate: string; dueDate: string; customerId: string; dealId: string | null;
  customer: { id: string; name: string }; items: { name: string; quantity: number; price: number }[];
};
type Customer = { id: string; name: string };

export default function InvoicesClient({ initialInvoices, customers }: { initialInvoices: Invoice[]; customers: Customer[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => { if (params.get("new") === "1") { setEditing(null); setFormOpen(true); } }, [params]);
  function closeForm() { setFormOpen(false); if (params.get("new")) router.replace("/invoices"); }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteInvoiceAction(deleteTarget.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not delete", description: res.error }); return; }
      toast({ kind: "success", title: "Invoice deleted" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const columns: Column<Invoice>[] = [
    { key: "number", header: "Invoice", sortable: true, render: (i) => (<div><p className="font-medium text-foreground">{i.number}</p><p className="text-xs text-muted">{i.customer.name}</p></div>) },
    { key: "total", header: "Amount", sortable: true, render: (i) => formatCurrency(i.total), exportValue: (i) => String(i.total) },
    { key: "status", header: "Status", sortable: true, render: (i) => <StatusBadge status={i.status} />, exportValue: (i) => i.status },
    { key: "issueDate", header: "Issued", render: (i) => formatDate(i.issueDate), hideOnMobile: true },
    { key: "dueDate", header: "Due", sortable: true, render: (i) => formatDate(i.dueDate) },
  ];

  return (
    <div>
      <DataTable
        data={initialInvoices}
        columns={columns}
        getId={(i) => i.id}
        searchPlaceholder="Search invoices..."
        searchFn={(i, q) => [i.number, i.customer.name].join(" ").toLowerCase().includes(q.toLowerCase())}
        exportName="invoices"
        emptyTitle="No invoices yet"
        emptyDescription="Create your first invoice to start billing customers."
        onRowClick={(i) => router.push(`/invoices/${i.id}`)}
        filters={<Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> Create Invoice</Button>}
        rowActions={(i) => (
          <Dropdown>
            <DropdownTrigger asChild><button className="rounded-md p-1.5 hover:bg-surface-2 text-muted"><MoreHorizontal className="size-4" /></button></DropdownTrigger>
            <DropdownContent>
              <DropdownItem asChild><Link href={`/invoices/${i.id}`}><Eye className="size-4 text-muted" /> View</Link></DropdownItem>
              <DropdownItem onSelect={() => { setEditing(i); setFormOpen(true); }}><Pencil className="size-4 text-muted" /> Edit</DropdownItem>
              <DropdownItem onSelect={() => setDeleteTarget(i)} className="text-danger hover:bg-danger-soft"><Trash2 className="size-4" /> Delete</DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      />

      <InvoiceFormModal open={formOpen} onOpenChange={(o) => (o ? setFormOpen(true) : closeForm())} customers={customers} invoice={editing} onSuccess={() => { closeForm(); router.refresh(); }} />

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete invoice" description={`This will permanently delete ${deleteTarget?.number ?? "this invoice"}.`} confirmLabel="Delete" danger pending={pending} onConfirm={handleDelete} />
    </div>
  );
}
