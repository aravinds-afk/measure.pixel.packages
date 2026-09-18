"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { forgotPasswordAction } from "@/actions/auth";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    startTransition(async () => {
      const res = await forgotPasswordAction({ email });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSent(true);
      setResetUrl(res.data?.resetUrl ?? null);
    });
  }

  if (sent) {
    return (
      <div className="animate-mp-fade-in">
        <div className="flex size-12 items-center justify-center rounded-full bg-success-soft">
          <MailCheck className="size-6 text-success" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">Check your email</h1>
        <p className="mt-1.5 text-sm text-muted">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a password reset link. It expires in 30 minutes.
        </p>
        {resetUrl && (
          <div className="mt-5 rounded-lg border border-brand/30 bg-brand-soft p-3.5 text-sm">
            <p className="text-brand font-medium">Demo mode: no email server configured.</p>
            <Link href={resetUrl} className="mt-1 inline-block text-brand underline break-all">
              {resetUrl}
            </Link>
          </div>
        )}
        <Button href="/login" variant="outline" className="mt-6 w-full">
          <ArrowLeft className="size-4" /> Back to login
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground">Forgot your password?</h1>
      <p className="mt-1.5 text-sm text-muted">Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <Label htmlFor="email" required>Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
          />
          <FieldError>{error ?? undefined}</FieldError>
        </div>
        <Button type="submit" className="w-full" loading={pending} disabled={pending}>
          {pending ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to login
      </Link>
    </>
  );
}
