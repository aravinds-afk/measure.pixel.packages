"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError, HelpText } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";
import { createEmployeeAction, updateEmployeeAction } from "@/actions/employees";
import { ROLE_LABELS } from "@/lib/rbac";

type Employee = {
  id: string; name: string; email: string; phone: string | null; department: string | null;
  designation: string | null; role: string; status: string; manager: { id: string } | null;
};

export default function EmployeeFormModal({
  open, onOpenChange, managers, employee, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; managers: { id: string; name: string }[]; employee: Employee | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const isEdit = !!employee;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { role: "EMPLOYEE", status: "ACTIVE" },
  });

  useEffect(() => {
    if (open) {
      reset(
        employee
          ? { name: employee.name, email: employee.email, phone: employee.phone ?? "", department: employee.department ?? "", designation: employee.designation ?? "", role: employee.role as EmployeeInput["role"], managerId: employee.manager?.id ?? "", status: employee.status as EmployeeInput["status"] }
          : { name: "", email: "", phone: "", department: "", designation: "", role: "EMPLOYEE", managerId: "", status: "ACTIVE" }
      );
    }
  }, [open, employee, reset]);

  function onSubmit(data: EmployeeInput) {
    startTransition(async () => {
      const res = isEdit ? await updateEmployeeAction(employee!.id, data) : await createEmployeeAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not save employee", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof EmployeeInput, { message: v });
        return;
      }
      toast({ kind: "success", title: isEdit ? "Employee updated" : "Employee added", description: isEdit ? undefined : "Default password: Welcome123!" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit employee" : "Add employee"}
      description={isEdit ? "Update employee details and access." : "New employees receive the default password Welcome123!"}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>{isEdit ? "Save changes" : "Add employee"}</Button>
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
          <Label required>Email</Label>
          <Input type="email" disabled={isEdit} {...register("email")} aria-invalid={!!errors.email} />
          <FieldError>{errors.email?.message}</FieldError>
          {isEdit && <HelpText>Email cannot be changed</HelpText>}
        </div>
        <div>
          <Label>Phone</Label>
          <Input {...register("phone")} />
        </div>
        <div>
          <Label>Department</Label>
          <Input {...register("department")} placeholder="e.g. Sales" />
        </div>
        <div>
          <Label>Designation</Label>
          <Input {...register("designation")} placeholder="e.g. Sales Executive" />
        </div>
        <div>
          <Label required>Role</Label>
          <Select {...register("role")}>
            {(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "EMPLOYEE"] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </div>
        <div>
          <Label>Reports to</Label>
          <Select {...register("managerId")}>
            <option value="">No manager</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </div>
        <div>
          <Label required>Status</Label>
          <Select {...register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
      </form>
    </Modal>
  );
}
