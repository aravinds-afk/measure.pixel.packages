"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import { createCustomerAction, updateCustomerAction } from "@/actions/customers";

type Customer = { id: string; name: string; company: string | null; email: string; phone: string; status: string; assignedTo: { id: string } | null };
type Staff = { id: string; name: string; role: string; designation: string | null };

export default function CustomerFormModal({
  open, onOpenChange, staff, customer, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff[];
  customer: Customer | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const isEdit = !!customer;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { status: "PROSPECT" },
  });

  useEffect(() => {
    if (open) {
      reset(
        customer
          ? { name: customer.name, company: customer.company ?? "", email: customer.email, phone: customer.phone, status: customer.status as CustomerInput["status"], assignedToId: customer.assignedTo?.id ?? "" }
          : { name: "", company: "", email: "", phone: "", status: "PROSPECT", assignedToId: "", industry: "", address: "", notes: "" }
      );
    }
  }, [open, customer, reset]);

  function onSubmit(data: CustomerInput) {
    startTransition(async () => {
      const res = isEdit ? await updateCustomerAction(customer!.id, data) : await createCustomerAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not save customer", description: res.error });
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof CustomerInput, { message: v });
        }
        return;
      }
      toast({ kind: "success", title: isEdit ? "Customer updated" : "Customer created" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit customer" : "Add customer"}
      description="Keep customer records accurate and up to date."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>{isEdit ? "Save changes" : "Create customer"}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Label required>Status</Label>
            <Select {...register("status")}>
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="CHURNED">Churned</option>
            </Select>
          </div>
          <div>
            <Label>Industry</Label>
            <Input {...register("industry")} placeholder="e.g. E-commerce" />
          </div>
          <div className="sm:col-span-2">
            <Label>Assigned employee</Label>
            <Select {...register("assignedToId")}>
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.designation ?? s.role}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input {...register("address")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={3} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
