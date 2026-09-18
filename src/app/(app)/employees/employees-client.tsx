"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Power, Eye } from "lucide-react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import { toggleEmployeeStatusAction } from "@/actions/employees";
import EmployeeFormModal from "./employee-form-modal";

type Employee = {
  id: string; name: string; email: string; phone: string | null; department: string | null; designation: string | null;
  role: string; status: string; joiningDate: string; manager: { id: string; name: string } | null;
};

export default function EmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [, startTransition] = useTransition();

  const managers = initialEmployees.filter((e) => ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(e.role));

  function handleToggle(e: Employee) {
    startTransition(async () => {
      const res = await toggleEmployeeStatusAction(e.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not update status", description: res.error }); return; }
      toast({ kind: "success", title: e.status === "ACTIVE" ? "Employee deactivated" : "Employee activated" });
      router.refresh();
    });
  }

  const columns: Column<Employee>[] = [
    {
      key: "name", header: "Employee", sortable: true,
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={e.name} size="sm" />
          <div><p className="font-medium text-foreground">{e.name}</p><p className="text-xs text-muted">{e.email}</p></div>
        </div>
      ),
    },
    { key: "department", header: "Department", render: (e) => e.department ?? "—", hideOnMobile: true },
    { key: "designation", header: "Designation", render: (e) => e.designation ?? "—" },
    { key: "role", header: "Role", sortable: true, render: (e) => <StatusBadge status={ROLE_LABELS[e.role as keyof typeof ROLE_LABELS] ?? e.role} />, exportValue: (e) => e.role },
    { key: "manager", header: "Manager", render: (e) => e.manager?.name ?? "—", hideOnMobile: true },
    { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} />, exportValue: (e) => e.status },
    { key: "joiningDate", header: "Joined", render: (e) => formatDate(e.joiningDate), hideOnMobile: true },
  ];

  return (
    <div>
      <DataTable
        data={initialEmployees}
        columns={columns}
        getId={(e) => e.id}
        searchPlaceholder="Search employees..."
        searchFn={(e, q) => [e.name, e.email, e.department, e.designation].join(" ").toLowerCase().includes(q.toLowerCase())}
        exportName="employees"
        emptyTitle="No employees yet"
        emptyDescription="Add your first team member to get started."
        onRowClick={(e) => router.push(`/employees/${e.id}`)}
        filters={<Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> Add Employee</Button>}
        rowActions={(e) => (
          <Dropdown>
            <DropdownTrigger asChild><button className="rounded-md p-1.5 hover:bg-surface-2 text-muted"><MoreHorizontal className="size-4" /></button></DropdownTrigger>
            <DropdownContent>
              <DropdownItem asChild><Link href={`/employees/${e.id}`}><Eye className="size-4 text-muted" /> View profile</Link></DropdownItem>
              <DropdownItem onSelect={() => { setEditing(e); setFormOpen(true); }}><Pencil className="size-4 text-muted" /> Edit</DropdownItem>
              <DropdownItem onSelect={() => handleToggle(e)} className={e.status === "ACTIVE" ? "text-danger hover:bg-danger-soft" : ""}>
                <Power className="size-4" /> {e.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      />

      <EmployeeFormModal open={formOpen} onOpenChange={setFormOpen} managers={managers} employee={editing} onSuccess={() => { setFormOpen(false); router.refresh(); }} />
    </div>
  );
}
