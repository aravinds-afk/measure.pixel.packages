"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { leadSchema, type LeadInput, LEAD_STATUSES, LEAD_SOURCES } from "@/lib/validations/lead";
import { createLeadAction, updateLeadAction } from "@/actions/leads";

type Lead = {
  id: string; name: string; company: string | null; email: string; phone: string; source: string;
  industry: string | null; value: number; status: string; priority: string; notes: string | null;
  nextFollowUp: string | null; assignedTo: { id: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };

export default function LeadFormModal({
  open, onOpenChange, staff, lead, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; staff: Staff[]; lead: Lead | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const isEdit = !!lead;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "NEW", priority: "MEDIUM", value: 0 },
  });

  useEffect(() => {
    if (open) {
      reset(
        lead
          ? {
              name: lead.name, company: lead.company ?? "", email: lead.email, phone: lead.phone, source: lead.source,
              industry: lead.industry ?? "", value: lead.value, status: lead.status as LeadInput["status"],
              priority: lead.priority as LeadInput["priority"], assignedToId: lead.assignedTo?.id ?? "",
              nextFollowUp: lead.nextFollowUp?.slice(0, 10) ?? "", notes: lead.notes ?? "",
            }
          : { name: "", company: "", email: "", phone: "", source: "Website", industry: "", value: 0, status: "NEW", priority: "MEDIUM", assignedToId: "", nextFollowUp: "", notes: "" }
      );
    }
  }, [open, lead, reset]);

  function onSubmit(data: LeadInput) {
    startTransition(async () => {
      const res = isEdit ? await updateLeadAction(lead!.id, data) : await createLeadAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not save lead", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof LeadInput, { message: v });
        return;
      }
      toast({ kind: "success", title: isEdit ? "Lead updated" : "Lead created" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit lead" : "Add lead"}
      description="Capture lead details to start nurturing the relationship."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>{isEdit ? "Save changes" : "Create lead"}</Button>
        </>
      }
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label required>Full name</Label>
          <Input {...register("name")} aria-invalid={!!errors.name} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label>Company</Label>
          <Input {...register("company")} />
        </div>
        <div>
          <Label required>Email</Label>
          <Input type="email" {...register("email")} aria-invalid={!!errors.email} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label required>Phone</Label>
          <Input {...register("phone")} aria-invalid={!!errors.phone} />
          <FieldError>{errors.phone?.message}</FieldError>
        </div>
        <div>
          <Label required>Source</Label>
          <Select {...register("source")}>{LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        </div>
        <div>
          <Label>Industry</Label>
          <Input {...register("industry")} />
        </div>
        <div>
          <Label required>Lead value (₹)</Label>
          <Input type="number" step="1000" {...register("value", { valueAsNumber: true })} aria-invalid={!!errors.value} />
          <FieldError>{errors.value?.message}</FieldError>
        </div>
        <div>
          <Label required>Status</Label>
          <Select {...register("status")}>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</Select>
        </div>
        <div>
          <Label required>Priority</Label>
          <Select {...register("priority")}>
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
          </Select>
        </div>
        <div>
          <Label>Next follow-up</Label>
          <Input type="date" {...register("nextFollowUp")} />
        </div>
        <div className="sm:col-span-2">
          <Label>Assigned employee</Label>
          <Select {...register("assignedToId")}>
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.designation ?? s.role}</option>)}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} {...register("notes")} />
        </div>
      </form>
    </Modal>
  );
}
