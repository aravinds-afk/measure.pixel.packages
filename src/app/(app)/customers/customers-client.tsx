"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Eye, Plus, Upload } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { deleteCustomerAction } from "@/actions/customers";
import CustomerFormModal from "./customer-form-modal";

type Customer = {
  id: string; name: string; company: string | null; email: string; phone: string;
  status: string; lastContact: string | null; createdAt: string;
  assignedTo: { id: string; name: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };

export default function CustomersClient({ initialCustomers, staff, canDelete }: { initialCustomers: Customer[]; staff: Staff[]; canDelete: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
    }
  }, [params]);

  function closeForm() {
    setFormOpen(false);
    if (params.get("new")) router.replace("/customers");
  }

  const columns: Column<Customer>[] = [
    {
      key: "name", header: "Customer", sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.name} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{c.name}</p>
            <p className="text-xs text-muted truncate">{c.company ?? "—"}</p>
          </div>
        </div>
      ),
      exportValue: (c) => c.name,
    },
    { key: "email", header: "Email", render: (c) => c.email, hideOnMobile: true },
    { key: "phone", header: "Phone", render: (c) => c.phone },
    { key: "status", header: "Status", sortable: true, render: (c) => <StatusBadge status={c.status} />, exportValue: (c) => c.status },
    { key: "assignedTo", header: "Assigned", render: (c) => c.assignedTo?.name ?? "Unassigned", exportValue: (c) => c.assignedTo?.name ?? "" },
    { key: "lastContact", header: "Last Contact", render: (c) => c.lastContact ? formatDate(c.lastContact) : "—", hideOnMobile: true },
  ];

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteCustomerAction(deleteTarget.id);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not delete", description: res.error });
        return;
      }
      toast({ kind: "success", title: "Customer deleted" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div>
      <DataTable
        data={initialCustomers}
        columns={columns}
        getId={(c) => c.id}
        searchPlaceholder="Search by name, company or email..."
        searchFn={(c, q) => [c.name, c.company, c.email, c.phone].join(" ").toLowerCase().includes(q.toLowerCase())}
        exportName="customers"
        emptyTitle="No customers yet"
        emptyDescription="Add your first customer to start managing your relationships."
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
        filters={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Upload className="size-3.5" /> Import</Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> Add Customer</Button>
          </div>
        }
        rowActions={(c) => (
          <Dropdown>
            <DropdownTrigger asChild>
              <button className="rounded-md p-1.5 hover:bg-surface-2 text-muted"><MoreHorizontal className="size-4" /></button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem asChild><Link href={`/customers/${c.id}`}><Eye className="size-4 text-muted" /> View</Link></DropdownItem>
              <DropdownItem onSelect={() => { setEditing(c); setFormOpen(true); }}><Pencil className="size-4 text-muted" /> Edit</DropdownItem>
              {canDelete && (
                <DropdownItem onSelect={() => setDeleteTarget(c)} className="text-danger hover:bg-danger-soft">
                  <Trash2 className="size-4" /> Delete
                </DropdownItem>
              )}
            </DropdownContent>
          </Dropdown>
        )}
      />

      <CustomerFormModal
        open={formOpen}
        onOpenChange={(o) => (o ? setFormOpen(true) : closeForm())}
        staff={staff}
        customer={editing}
        onSuccess={() => { closeForm(); router.refresh(); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete customer"
        description={`This will permanently delete ${deleteTarget?.name ?? "this customer"} and cannot be undone.`}
        confirmLabel="Delete customer"
        danger
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
