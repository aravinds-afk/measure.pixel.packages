"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, HelpText } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { resetPasswordFormSchema, generateSecurePassword } from "@/lib/validations/employee";
import { resetEmployeePasswordAction } from "@/actions/employees";

export default function ResetPasswordModal({
  open, onOpenChange, employee, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; employee: { id: string; name: string } | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(undefined);
      setShowPassword(false);
    }
  }, [open]);

  function handleSubmit() {
    if (!employee) return;
    const check = resetPasswordFormSchema.shape.password.safeParse(password);
    if (!check.success) {
      setError(check.error.issues[0]?.message);
      return;
    }
    startTransition(async () => {
      const res = await resetEmployeePasswordAction(employee.id, { password });
      if (!res.ok) {
        toast({ kind: "error", title: "Could not reset password", description: res.error });
        if (res.fieldErrors?.password) setError(res.fieldErrors.password);
        return;
      }
      toast({ kind: "success", title: "Password reset", description: `${employee.name} has been signed out everywhere.` });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Reset password${employee ? ` — ${employee.name}` : ""}`}
      description="This signs the account out on any device it's currently logged into."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit}>Reset password</Button>
        </>
      }
    >
      <div>
        <Label required>New password</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(undefined); }}
              aria-invalid={!!error}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button type="button" variant="outline" onClick={() => { setPassword(generateSecurePassword()); setError(undefined); setShowPassword(true); }}>
            <Wand2 className="size-4" /> Generate
          </Button>
        </div>
        <FieldError>{error}</FieldError>
        <HelpText>Share the new password with them directly.</HelpText>
      </div>
    </Modal>
  );
}
