"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";
import { updateTaskStatusAction } from "@/actions/tasks";
import { TASK_STATUSES } from "@/lib/validations/task";
import { useToast } from "@/components/ui/toast";
import type { TaskStatus } from "@prisma/client";

type Task = {
  id: string; title: string; priority: string; status: string; dueDate: string | null;
  assignedTo: { id: string; name: string } | null;
};

const LABEL: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", COMPLETED: "Completed", CANCELLED: "Cancelled" };

export default function TasksKanban({ tasks, onEdit }: { tasks: Task[]; onEdit: (t: Task) => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  function handleDrop(status: string) {
    if (!dragId) return;
    startTransition(async () => {
      const res = await updateTaskStatusAction(dragId, status as TaskStatus);
      if (!res.ok) toast({ kind: "error", title: "Could not update task", description: res.error });
      else router.refresh();
    });
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {TASK_STATUSES.map((status) => {
        const items = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className={cn("w-72 shrink-0 rounded-xl border border-border bg-surface-2/40 p-3", overCol === status && "ring-2 ring-brand")}
            onDragOver={(e) => { e.preventDefault(); setOverCol(status); }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={() => handleDrop(status)}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-foreground">{LABEL[status]}</p>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{items.length}</span>
            </div>
            <div className="space-y-2.5 min-h-[60px]">
              {items.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onClick={() => onEdit(task)}
                  className="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
                >
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusBadge status={task.priority} />
                    {task.dueDate && <span className="flex items-center gap-1 text-[11px] text-muted"><CalendarIcon className="size-3" /> {formatDate(task.dueDate)}</span>}
                  </div>
                  <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted">{task.assignedTo?.name ?? "Unassigned"}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
