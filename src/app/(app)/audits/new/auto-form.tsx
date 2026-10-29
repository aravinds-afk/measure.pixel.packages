"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, idempotencyKey } from "@/lib/api-client";
import { Button, Field, Input, Notice } from "@/components/ui";

const STEPS = ["Reading the website", "Checking Instagram", "Filling the audit", "Detecting the industry", "Prescribing services", "Drafting the quotation"];

export function AutoAuditForm({ clientId, defaults }: { clientId?: string; defaults?: { website: string; instagram: string; name: string } }) {
  const router = useRouter();
  const key = useMemo(() => idempotencyKey(), []);
  const [website, setWebsite] = useState(defaults?.website ?? "");
  const [instagram, setInstagram] = useState(defaults?.instagram ?? "");
  const [name, setName] = useState(defaults?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
    return () => clearInterval(t);
  }, [busy]);

  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!website.trim() && !instagram.trim() && !clientId) return setError("Paste a website or an Instagram link.");
      setBusy(true); setStep(0); setError(null);
      try {
        const r = await api<{ auditId: string }>("/api/audits/auto", { body: { website, instagram, businessName: name, clientId, idempotencyKey: key } });
        router.push(`/audits/${r.auditId}/prescription`);
      } catch (err) {
        setError((err as Error).message);
        setBusy(false);
      }
    }}>
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Website" htmlFor="a-web"><Input id="a-web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="brand.com" inputMode="url" autoCapitalize="none" spellCheck={false} disabled={busy} /></Field>
      <Field label="Instagram" htmlFor="a-ig" hint="Profile link or @handle"><Input id="a-ig" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@brand" autoCapitalize="none" spellCheck={false} disabled={busy} /></Field>
      <Field label="Business name (optional)" htmlFor="a-name" hint="Detected automatically when left blank"><Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} /></Field>
      <Button type="submit" size="lg" loading={busy}>{busy ? STEPS[step] + "…" : "Run automatic audit"}</Button>
      {busy && <p className="text-[13px] text-ink-3">Takes 20–60 seconds. Public pages only; robots.txt respected.</p>}
      {!busy && <p className="text-[13px] text-ink-3">Prefer to fill it in yourself? <Link className="underline" href={`/audits/new?manual=1${clientId ? `&clientId=${clientId}` : ""}`}>Start a manual audit</Link></p>}
    </form>
  );
}
