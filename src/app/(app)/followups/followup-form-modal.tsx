"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { followUpSchema, type FollowUpInput, FOLLOWUP_TYPES } from "@/lib/validations/followup";
import { createFollowUpAction, updateFollowUpAction } from "@/actions/followups";

type FollowUp = {
  id: string; type: string; status: string; notes: string | null; scheduledAt: string; reminder: boolean;
  customer: { id: string } | null; lead: { id: string } | null; assignedTo: { id: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };
type Customer = { id: string; name: string };
type Lead = { id: string; name: string };

export default function FollowUpFormModal({
  open, onOpenChange, staff, customers, leads, followUp, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; staff: Staff[]; customers: Customer[]; leads: Lead[]; followUp: FollowUp | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const isEdit = !!followUp;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<FollowUpInput>({
    resolver: zodResolver(followUpSchema),
    defaultValues: { type: "PHONE", status: "PENDING", reminder: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        followUp
          ? { type: followUp.type as FollowUpInput["type"], status: followUp.status as FollowUpInput["status"], notes: followUp.notes ?? "", scheduledAt: followUp.scheduledAt.slice(0, 16), reminder: followUp.reminder, customerId: followUp.customer?.id ?? "", leadId: followUp.lead?.id ?? "", assignedToId: followUp.assignedTo?.id ?? "" }
          : { type: "PHONE", status: "PENDING", notes: "", scheduledAt: "", reminder: true, customerId: "", leadId: "", assignedToId: "" }
      );
    }
  }, [open, followUp, reset]);

  function onSubmit(data: FollowUpInput) {
    startTransition(async () => {
      const res = isEdit ? await updateFollowUpAction(followUp!.id, data) : await createFollowUpAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not save follow-up", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof FollowUpInput, { message: v });
        return;
      }
      toast({ kind: "success", title: isEdit ? "Follow-up updated" : "Follow-up scheduled" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit follow-up" : "Schedule follow-up"}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>{isEdit ? "Save changes" : "Schedule"}</Button>
        </>
      }
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label required>Type</Label>
          <Select {...register("type")}>{FOLLOWUP_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</Select>
        </div>
        <div>
          <Label required>Date & time</Label>
          <Input type="datetime-local" {...register("scheduledAt")} aria-invalid={!!errors.scheduledAt} />
          <FieldError>{errors.scheduledAt?.message}</FieldError>
        </div>
        <div>
          <Label>Customer</Label>
          <Select {...register("customerId")}><option value="">None</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </div>
        <div>
          <Label>Lead</Label>
          <Select {...register("leadId")}><option value="">None</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        </div>
        <div>
          <Label>Assigned to</Label>
          <Select {...register("assignedToId")}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </div>
        <div>
          <Label required>Status</Label>
          <Select {...register("status")}>
            <option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="OVERDUE">Overdue</option><option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} {...register("notes")} />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" {...register("reminder")} /> Send reminder
          </label>
        </div>
      </form>
    </Modal>
  );
}
