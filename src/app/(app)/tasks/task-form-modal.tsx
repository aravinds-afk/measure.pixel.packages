"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { taskSchema, type TaskInput, TASK_STATUSES } from "@/lib/validations/task";
import { createTaskAction, updateTaskAction } from "@/actions/tasks";

type Task = {
  id: string; title: string; description: string | null; priority: string; status: string; dueDate: string | null; reminder: boolean;
  assignedTo: { id: string } | null; customer: { id: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };
type Customer = { id: string; name: string };

export default function TaskFormModal({
  open, onOpenChange, staff, customers, task, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; staff: Staff[]; customers: Customer[]; task: Task | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const isEdit = !!task;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: "TODO", priority: "MEDIUM" },
  });

  useEffect(() => {
    if (open) {
      reset(
        task
          ? { title: task.title, description: task.description ?? "", priority: task.priority as TaskInput["priority"], status: task.status as TaskInput["status"], dueDate: task.dueDate?.slice(0, 10) ?? "", reminder: task.reminder, assignedToId: task.assignedTo?.id ?? "", customerId: task.customer?.id ?? "" }
          : { title: "", description: "", priority: "MEDIUM", status: "TODO", dueDate: "", reminder: false, assignedToId: "", customerId: "" }
      );
    }
  }, [open, task, reset]);

  function onSubmit(data: TaskInput) {
    startTransition(async () => {
      const res = isEdit ? await updateTaskAction(task!.id, data) : await createTaskAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not save task", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof TaskInput, { message: v });
        return;
      }
      toast({ kind: "success", title: isEdit ? "Task updated" : "Task created" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit task" : "Add task"}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>{isEdit ? "Save changes" : "Create task"}</Button>
        </>
      }
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="sm:col-span-2">
          <Label required>Task title</Label>
          <Input {...register("title")} aria-invalid={!!errors.title} />
          <FieldError>{errors.title?.message}</FieldError>
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea rows={2} {...register("description")} />
        </div>
        <div>
          <Label>Assigned to</Label>
          <Select {...register("assignedToId")}>
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div>
          <Label>Customer</Label>
          <Select {...register("customerId")}>
            <option value="">None</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <Label required>Priority</Label>
          <Select {...register("priority")}>
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
          </Select>
        </div>
        <div>
          <Label required>Status</Label>
          <Select {...register("status")}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</Select>
        </div>
        <div>
          <Label>Due date</Label>
          <Input type="date" {...register("dueDate")} />
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" {...register("reminder")} /> Set reminder
          </label>
        </div>
      </form>
    </Modal>
  );
}
