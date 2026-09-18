"use client";

import { useEffect, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { invoiceSchema, type InvoiceInput, INVOICE_STATUSES } from "@/lib/validations/invoice";
import { createInvoiceAction, updateInvoiceAction } from "@/actions/invoices";
import { formatCurrency } from "@/lib/utils";

type Invoice = {
  id: string; status: string; tax: number; discount: number; issueDate: string; dueDate: string;
  customerId: string; dealId: string | null; items: { name: string; quantity: number; price: number }[];
};
type Customer = { id: string; name: string };

export default function InvoiceFormModal({
  open, onOpenChange, customers, invoice, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; customers: Customer[]; invoice: Invoice | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const isEdit = !!invoice;

  const { register, control, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { status: "DRAFT", tax: 18, discount: 0, items: [{ name: "", quantity: 1, price: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      const due = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
      reset(
        invoice
          ? { customerId: invoice.customerId, dealId: invoice.dealId ?? "", issueDate: invoice.issueDate.slice(0, 10), dueDate: invoice.dueDate.slice(0, 10), tax: invoice.tax, discount: invoice.discount, status: invoice.status as InvoiceInput["status"], items: invoice.items }
          : { customerId: "", dealId: "", issueDate: today, dueDate: due, tax: 18, discount: 0, status: "DRAFT", items: [{ name: "", quantity: 1, price: 0 }] }
      );
    }
  }, [open, invoice, reset]);

  const items = watch("items");
  const tax = watch("tax") || 0;
  const discount = watch("discount") || 0;
  const subtotal = items?.reduce((s, it) => s + (it.quantity || 0) * (it.price || 0), 0) ?? 0;
  const total = subtotal * (1 + tax / 100) * (1 - discount / 100);

  function onSubmit(data: InvoiceInput) {
    startTransition(async () => {
      const res = isEdit ? await updateInvoiceAction(invoice!.id, data) : await createInvoiceAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not save invoice", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof InvoiceInput, { message: v });
        return;
      }
      toast({ kind: "success", title: isEdit ? "Invoice updated" : "Invoice created" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit invoice" : "Create invoice"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>{isEdit ? "Save changes" : "Create invoice"}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>Customer</Label>
            <Select {...register("customerId")} aria-invalid={!!errors.customerId}>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <FieldError>{errors.customerId?.message}</FieldError>
          </div>
          <div>
            <Label required>Status</Label>
            <Select {...register("status")}>{INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</Select>
          </div>
          <div>
            <Label required>Issue date</Label>
            <Input type="date" {...register("issueDate")} />
          </div>
          <div>
            <Label required>Due date</Label>
            <Input type="date" {...register("dueDate")} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Line items</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", quantity: 1, price: 0 })}><Plus className="size-3.5" /> Add item</Button>
          </div>
          <FieldError>{errors.items?.message}</FieldError>
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6"><Input placeholder="Item name" {...register(`items.${i}.name`)} /></div>
                <div className="col-span-2"><Input type="number" min={1} placeholder="Qty" {...register(`items.${i}.quantity`, { valueAsNumber: true })} /></div>
                <div className="col-span-3"><Input type="number" min={0} placeholder="Price" {...register(`items.${i}.price`, { valueAsNumber: true })} /></div>
                <button type="button" onClick={() => fields.length > 1 && remove(i)} className="col-span-1 flex h-10 items-center justify-center text-muted hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-2 p-4">
          <div>
            <Label>Tax (%)</Label>
            <Input type="number" min={0} max={100} {...register("tax", { valueAsNumber: true })} />
          </div>
          <div>
            <Label>Discount (%)</Label>
            <Input type="number" min={0} max={100} {...register("discount", { valueAsNumber: true })} />
          </div>
          <div className="col-span-2 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted">Subtotal</span><span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          <div className="col-span-2 flex items-center justify-between text-base font-semibold">
            <span className="text-foreground">Total</span><span className="text-brand">{formatCurrency(total)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
