"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { resetPasswordAction } from "@/actions/auth";
import { resetPasswordSchema, passwordStrength } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

const STRENGTH_LABEL = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["bg-danger", "bg-danger", "bg-warning", "bg-info", "bg-success"];

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const strength = passwordStrength(password);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    startTransition(async () => {
      const res = await resetPasswordAction({ token, password, confirmPassword });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2200);
    });
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Invalid link</h1>
        <p className="mt-1.5 text-sm text-muted">This password reset link is missing a token.</p>
        <Button href="/forgot-password" variant="outline" className="mt-6 w-full">Request a new link</Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="animate-mp-fade-in">
        <div className="flex size-12 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-6 text-success" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">Password updated</h1>
        <p className="mt-1.5 text-sm text-muted">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
      <p className="mt-1.5 text-sm text-muted">Choose a strong password to secure your account.</p>

      {formError && (
        <div className="mt-5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <Label htmlFor="password" required>New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn("h-1 flex-1 rounded-full bg-surface-2", i < strength && STRENGTH_COLOR[strength])} />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">{STRENGTH_LABEL[strength]}</p>
            </div>
          )}
          <FieldError>{errors.password}</FieldError>
        </div>
        <div>
          <Label htmlFor="confirmPassword" required>Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!errors.confirmPassword}
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </div>
        <Button type="submit" className="w-full" loading={pending} disabled={pending}>
          {pending ? "Updating..." : "Reset password"}
        </Button>
      </form>

      <Link href="/login" className="mt-6 block text-center text-sm font-medium text-muted hover:text-foreground">
        Back to login
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted" /></div>}>
      <ResetForm />
    </Suspense>
  );
}
