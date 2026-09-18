"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, LayoutGrid, Calendar as CalendarIcon, MoreHorizontal, Pencil, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { deleteTaskAction, updateTaskStatusAction } from "@/actions/tasks";
import { MonthView } from "@/components/calendar/month-view";
import TaskFormModal from "./task-form-modal";
import TasksKanban from "./tasks-kanban";

type Task = {
  id: string; title: string; description: string | null; priority: string; status: string; dueDate: string | null; reminder: boolean;
  assignedTo: { id: string; name: string } | null; customer: { id: string; name: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };
type Customer = { id: string; name: string };

const PRIORITY_TONE: Record<string, string> = { LOW: "brand", MEDIUM: "info", HIGH: "warning", URGENT: "danger" };

export default function TasksClient({ initialTasks, staff, customers }: { initialTasks: Task[]; staff: Staff[]; customers: Customer[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "kanban" | "calendar">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => { if (params.get("new") === "1") { setEditing(null); setFormOpen(true); } }, [params]);
  function closeForm() { setFormOpen(false); if (params.get("new")) router.replace("/tasks"); }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteTaskAction(deleteTarget.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not delete", description: res.error }); return; }
      toast({ kind: "success", title: "Task deleted" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  function handleComplete(t: Task) {
    startTransition(async () => {
      const res = await updateTaskStatusAction(t.id, "COMPLETED");
      if (!res.ok) { toast({ kind: "error", title: "Could not update task", description: res.error }); return; }
      toast({ kind: "success", title: "Task marked complete" });
      router.refresh();
    });
  }

  const columns: Column<Task>[] = [
    { key: "title", header: "Task", sortable: true, render: (t) => (<div><p className="font-medium text-foreground">{t.title}</p><p className="text-xs text-muted">{t.customer?.name ?? "—"}</p></div>) },
    { key: "priority", header: "Priority", render: (t) => <StatusBadge status={t.priority} />, exportValue: (t) => t.priority },
    { key: "status", header: "Status", sortable: true, render: (t) => <StatusBadge status={t.status} />, exportValue: (t) => t.status },
    { key: "dueDate", header: "Due", sortable: true, render: (t) => t.dueDate ? formatDate(t.dueDate) : "—" },
    { key: "assignedTo", header: "Assigned", render: (t) => t.assignedTo?.name ?? "Unassigned", hideOnMobile: true },
  ];

  const calendarItems = initialTasks.filter((t) => t.dueDate).map((t) => ({ id: t.id, date: new Date(t.dueDate!), title: t.title, tone: PRIORITY_TONE[t.priority] }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-1 w-fit">
          {[{ v: "list", icon: List, label: "List" }, { v: "kanban", icon: LayoutGrid, label: "Kanban" }, { v: "calendar", icon: CalendarIcon, label: "Calendar" }].map((opt) => (
            <button key={opt.v} onClick={() => setView(opt.v as typeof view)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === opt.v ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}>
              <opt.icon className="size-3.5" /> {opt.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> Add Task</Button>
      </div>

      {view === "list" && (
        <DataTable
          data={initialTasks}
          columns={columns}
          getId={(t) => t.id}
          searchPlaceholder="Search tasks..."
          searchFn={(t, q) => [t.title, t.customer?.name].join(" ").toLowerCase().includes(q.toLowerCase())}
          exportName="tasks"
          emptyTitle="No tasks yet"
          emptyDescription="Create a task to keep your team on track."
          rowActions={(t) => (
            <Dropdown>
              <DropdownTrigger asChild><button className="rounded-md p-1.5 hover:bg-surface-2 text-muted"><MoreHorizontal className="size-4" /></button></DropdownTrigger>
              <DropdownContent>
                {t.status !== "COMPLETED" && <DropdownItem onSelect={() => handleComplete(t)}><CheckCircle2 className="size-4 text-muted" /> Mark complete</DropdownItem>}
                <DropdownItem onSelect={() => { setEditing(t); setFormOpen(true); }}><Pencil className="size-4 text-muted" /> Edit</DropdownItem>
                <DropdownItem onSelect={() => setDeleteTarget(t)} className="text-danger hover:bg-danger-soft"><Trash2 className="size-4" /> Delete</DropdownItem>
              </DropdownContent>
            </Dropdown>
          )}
        />
      )}

      {view === "kanban" && <TasksKanban tasks={initialTasks} onEdit={(t) => { setEditing(t as Task); setFormOpen(true); }} />}

      {view === "calendar" && (
        <MonthView items={calendarItems} onSelectItem={(id) => { const t = initialTasks.find((x) => x.id === id); if (t) { setEditing(t); setFormOpen(true); } }} />
      )}

      <TaskFormModal open={formOpen} onOpenChange={(o) => (o ? setFormOpen(true) : closeForm())} staff={staff} customers={customers} task={editing} onSuccess={() => { closeForm(); router.refresh(); }} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete task"
        description={`This will permanently delete "${deleteTarget?.title ?? ""}".`}
        confirmLabel="Delete task"
        danger
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
