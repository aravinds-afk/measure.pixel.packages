"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api, idempotencyKey } from "@/lib/api-client";
import { Button, Field, Input, Notice } from "@/components/ui";

type ClientPrefill = { id: string; businessName: string; website: string; instagram: string; linkedin: string; youtube: string; otherLinks: string[] } | null;

export function DiscoveryForm({ client }: { client: ClientPrefill }) {
  const router = useRouter();
  const key = useMemo(() => idempotencyKey(), []);
  const [website, setWebsite] = useState(client?.website ?? "");
  const [businessName, setBusinessName] = useState(client?.businessName ?? "");
  const [instagram, setInstagram] = useState(client?.instagram ?? "");
  const [linkedin, setLinkedin] = useState(client?.linkedin ?? "");
  const [youtube, setYoutube] = useState(client?.youtube ?? "");
  const [others, setOthers] = useState<string[]>(client?.otherLinks.length ? client.otherLinks : []);
  const [showSocial, setShowSocial] = useState(!!(instagram || linkedin || youtube || others.length));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canStart = !!(client || website.trim() || businessName.trim() || instagram.trim() || linkedin.trim() || youtube.trim() || others.some((o) => o.trim()));

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canStart) return setError("Enter a website, a business name or at least one profile link.");
        setLoading(true);
        setError(null);
        try {
          const res = await api<{ auditId: string }>("/api/audits", {
            body: { website, businessName, instagram, linkedin, youtube, otherLinks: others.filter((o) => o.trim()), clientId: client?.id, idempotencyKey: key },
          });
          router.push(`/audits/${res.auditId}${website.trim() ? "?discover=1" : ""}`);
        } catch (err) {
          setError((err as Error).message);
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      {client && <Notice tone="info">Starting a new audit for <strong>{client.businessName}</strong>. Previous audits and quotations stay unchanged.</Notice>}
      <Field label="Business website" htmlFor="website" hint="Preferred starting point. Public pages only; robots.txt is respected.">
        <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="example.com" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false} />
      </Field>
      <Field label="Business name" htmlFor="businessName" hint="Leave blank to detect it from the website. You can edit it later.">
        <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Detected from the website" autoComplete="organization" />
      </Field>

      {!showSocial ? (
        <button type="button" onClick={() => setShowSocial(true)} className="self-start text-[14px] font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
          + Add Instagram, LinkedIn, YouTube or other links
        </button>
      ) : (
        <fieldset className="card flex flex-col gap-4 p-4">
          <legend className="sr-only">Social and other links (optional)</legend>
          <p className="eyebrow">Optional links</p>
          <Field label="Instagram" htmlFor="ig"><Input id="ig" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="instagram.com/handle" inputMode="url" autoCapitalize="none" /></Field>
          <Field label="LinkedIn" htmlFor="li"><Input id="li" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/company/…" inputMode="url" autoCapitalize="none" /></Field>
          <Field label="YouTube" htmlFor="yt"><Input id="yt" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="youtube.com/@channel" inputMode="url" autoCapitalize="none" /></Field>
          {others.map((o, i) => (
            <div key={i} className="flex items-end gap-2">
              <Field label={`Other link ${i + 1}`} htmlFor={`o${i}`} className="flex-1">
                <Input id={`o${i}`} value={o} onChange={(e) => setOthers(others.map((x, j) => (j === i ? e.target.value : x)))} inputMode="url" autoCapitalize="none" />
              </Field>
              <Button type="button" variant="ghost" aria-label={`Remove link ${i + 1}`} onClick={() => setOthers(others.filter((_, j) => j !== i))}>Remove</Button>
            </div>
          ))}
          {others.length < 10 && (
            <button type="button" onClick={() => setOthers([...others, ""])} className="self-start text-[14px] font-medium text-ink-2 hover:text-ink">+ Add another link</button>
          )}
        </fieldset>
      )}

      <Button type="submit" size="lg" loading={loading} disabled={!canStart} className="mt-2 w-full sm:w-auto sm:self-start">
        Start Brand Audit
      </Button>
      <p className="text-[13px] text-ink-3">No website? Enter the business name or a profile link and assess manually.</p>
    </form>
  );
}
