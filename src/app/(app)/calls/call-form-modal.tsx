"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { callSchema, type CallInput, CALL_OUTCOMES } from "@/lib/validations/call";
import { createCallAction } from "@/actions/calls";

type Customer = { id: string; name: string; phone: string };
type Lead = { id: string; name: string; phone: string };

export default function CallFormModal({
  open, onOpenChange, customers, leads, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; customers: Customer[]; leads: Lead[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, reset, setError, watch, setValue, formState: { errors } } = useForm<CallInput>({
    resolver: zodResolver(callSchema),
    defaultValues: { direction: "OUTGOING", outcome: "CONNECTED", duration: 0 },
  });

  useEffect(() => {
    if (open) reset({ customerId: "", leadId: "", phone: "", direction: "OUTGOING", duration: 0, outcome: "CONNECTED", notes: "", nextFollowUp: "" });
  }, [open, reset]);

  const customerId = watch("customerId");
  const leadId = watch("leadId");

  useEffect(() => {
    const c = customers.find((c) => c.id === customerId);
    if (c) setValue("phone", c.phone);
  }, [customerId, customers, setValue]);
  useEffect(() => {
    const l = leads.find((l) => l.id === leadId);
    if (l) setValue("phone", l.phone);
  }, [leadId, leads, setValue]);

  function onSubmit(data: CallInput) {
    startTransition(async () => {
      const res = await createCallAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not log call", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof CallInput, { message: v });
        return;
      }
      toast({ kind: "success", title: "Call logged" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Log a call"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>Log call</Button>
        </>
      }
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label>Customer</Label>
          <Select {...register("customerId")}><option value="">None</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </div>
        <div>
          <Label>Lead</Label>
          <Select {...register("leadId")}><option value="">None</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        </div>
        <div>
          <Label required>Phone number</Label>
          <Input {...register("phone")} aria-invalid={!!errors.phone} />
          <FieldError>{errors.phone?.message}</FieldError>
        </div>
        <div>
          <Label required>Direction</Label>
          <Select {...register("direction")}><option value="OUTGOING">Outgoing</option><option value="INCOMING">Incoming</option><option value="MISSED">Missed</option></Select>
        </div>
        <div>
          <Label required>Duration (seconds)</Label>
          <Input type="number" min={0} {...register("duration", { valueAsNumber: true })} />
        </div>
        <div>
          <Label required>Outcome</Label>
          <Select {...register("outcome")}>{CALL_OUTCOMES.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</Select>
        </div>
        <div>
          <Label>Next follow-up</Label>
          <Input type="date" {...register("nextFollowUp")} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} {...register("notes")} />
        </div>
      </form>
    </Modal>
  );
}
