"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api-client";
import { Button, Field, Input, Notice } from "@/components/ui";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setLoading(true);
        setError(null);
        try {
          await api("/api/auth/login", { body: { email: fd.get("email"), password: fd.get("password") } });
          const next = params.get("next");
          router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/audits/new");
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required inputMode="email" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" loading={loading} className="mt-2">Sign in</Button>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
