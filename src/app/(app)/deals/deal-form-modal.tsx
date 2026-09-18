"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { dealSchema, type DealInput, DEAL_STAGES } from "@/lib/validations/deal";
import { createDealAction, updateDealAction } from "@/actions/deals";

type Deal = {
  id: string; name: string; value: number; probability: number; stage: string; expectedClose: string | null;
  notes: string | null; customerId: string | null; leadId: string | null; assignedTo: { id: string } | null;
};
type Staff = { id: string; name: string; role: string; designation: string | null };
type Customer = { id: string; name: string };

export default function DealFormModal({
  open, onOpenChange, staff, customers, deal, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; staff: Staff[]; customers: Customer[]; deal: Deal | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const isEdit = !!deal;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<DealInput>({
    resolver: zodResolver(dealSchema),
    defaultValues: { stage: "NEW", probability: 50, value: 0 },
  });

  useEffect(() => {
    if (open) {
      reset(
        deal
          ? {
              name: deal.name, value: deal.value, probability: deal.probability, stage: deal.stage as DealInput["stage"],
              expectedClose: deal.expectedClose?.slice(0, 10) ?? "", customerId: deal.customerId ?? "", assignedToId: deal.assignedTo?.id ?? "",
              notes: deal.notes ?? "",
            }
          : { name: "", value: 0, probability: 50, stage: "NEW", expectedClose: "", customerId: "", assignedToId: "", notes: "" }
      );
    }
  }, [open, deal, reset]);

  function onSubmit(data: DealInput) {
    startTransition(async () => {
      const res = isEdit ? await updateDealAction(deal!.id, data) : await createDealAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not save deal", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof DealInput, { message: v });
        return;
      }
      toast({ kind: "success", title: isEdit ? "Deal updated" : "Deal created" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit deal" : "Add deal"}
      description="Track deal value and probability through your pipeline."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>{isEdit ? "Save changes" : "Create deal"}</Button>
        </>
      }
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="sm:col-span-2">
          <Label required>Deal name</Label>
          <Input {...register("name")} aria-invalid={!!errors.name} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label>Customer</Label>
          <Select {...register("customerId")}>
            <option value="">None</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <Label required>Stage</Label>
          <Select {...register("stage")}>{DEAL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        </div>
        <div>
          <Label required>Deal value (₹)</Label>
          <Input type="number" step="1000" {...register("value", { valueAsNumber: true })} aria-invalid={!!errors.value} />
          <FieldError>{errors.value?.message}</FieldError>
        </div>
        <div>
          <Label required>Probability (%)</Label>
          <Input type="number" min={0} max={100} {...register("probability", { valueAsNumber: true })} aria-invalid={!!errors.probability} />
          <FieldError>{errors.probability?.message}</FieldError>
        </div>
        <div>
          <Label>Expected close date</Label>
          <Input type="date" {...register("expectedClose")} />
        </div>
        <div>
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
