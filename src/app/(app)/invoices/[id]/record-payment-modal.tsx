"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { paymentSchema, type PaymentInput, PAYMENT_METHODS } from "@/lib/validations/invoice";
import { recordPaymentAction } from "@/actions/invoices";

export default function RecordPaymentModal({
  open, onOpenChange, invoiceId, balanceDue, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; invoiceId: string; balanceDue: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { invoiceId, method: "Bank Transfer" },
  });

  useEffect(() => { if (open) reset({ invoiceId, amount: Math.round(balanceDue), method: "Bank Transfer" }); }, [open, invoiceId, balanceDue, reset]);

  function onSubmit(data: PaymentInput) {
    startTransition(async () => {
      const res = await recordPaymentAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not record payment", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof PaymentInput, { message: v });
        return;
      }
      toast({ kind: "success", title: "Payment recorded" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record payment"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>Record payment</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label required>Amount (₹)</Label>
          <Input type="number" min={1} {...register("amount", { valueAsNumber: true })} aria-invalid={!!errors.amount} />
          <FieldError>{errors.amount?.message}</FieldError>
        </div>
        <div>
          <Label required>Payment method</Label>
          <Select {...register("method")}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
        </div>
      </form>
    </Modal>
  );
}
