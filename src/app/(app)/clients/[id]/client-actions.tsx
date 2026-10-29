"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api, idempotencyKey } from "@/lib/api-client";
import { MoneyInput } from "@/components/money-input";
import { useToast } from "@/components/toast";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

export function NewQuoteButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const key = useMemo(() => idempotencyKey(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end">
      <Button loading={loading} onClick={async () => {
        setLoading(true);
        try {
          const r = await api<{ quoteId: string }>("/api/quotes", { body: { clientId, idempotencyKey: key } });
          router.push(`/quotes/${r.quoteId}`);
        } catch (e) {
          setError((e as Error).message);
          setLoading(false);
        }
      }}>New quotation</Button>
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  );
}

type ClientData = { id: string; businessName: string; website: string; contactPerson: string; phone: string; email: string; notes: string; nextFollowUp: string | null; industryId: string | null; lastContactAt: string | null };

export function ClientEditor({ client, industries }: { client: ClientData; industries: { id: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [c, setC] = useState(client);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<ClientData>) => setC((x) => ({ ...x, ...p }));
  return (
    <Card className="p-5">
      <p className="eyebrow mb-4">Details & follow-up</p>
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          const r = await api<{ sync: { status: string; error?: string } }>(`/api/clients/${c.id}`, { method: "PATCH", body: { businessName: c.businessName, website: c.website, contactPerson: c.contactPerson, phone: c.phone, email: c.email, notes: c.notes, nextFollowUp: c.nextFollowUp || null, industryId: c.industryId || null, touchContact: true } });
          toast(r.sync.status === "synced" ? "ok" : "warn", r.sync.status === "synced" ? "Saved and recorded in Google Sheets." : r.sync.status === "not_configured" ? "Saved. Google Sheets is not configured." : `Saved. Google Sheets: ${r.sync.error ?? r.sync.status} — will retry.`);
          router.refresh();
        } catch (err) {
          toast("danger", (err as Error).message);
        } finally {
          setSaving(false);
        }
      }}>
        <Field label="Business name" htmlFor="c-bn"><Input id="c-bn" value={c.businessName} onChange={(e) => set({ businessName: e.target.value })} required /></Field>
        <Field label="Industry" htmlFor="c-in">
          <Select id="c-in" value={c.industryId ?? ""} onChange={(e) => set({ industryId: e.target.value || null })}>
            <option value="">Not set</option>
            {industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        </Field>
        <Field label="Website" htmlFor="c-ws"><Input id="c-ws" value={c.website} onChange={(e) => set({ website: e.target.value })} /></Field>
        <Field label="Contact person" htmlFor="c-cp"><Input id="c-cp" value={c.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="c-ph"><Input id="c-ph" value={c.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" /></Field>
        <Field label="Email" htmlFor="c-em"><Input id="c-em" value={c.email} onChange={(e) => set({ email: e.target.value })} inputMode="email" /></Field>
        <Field label="Next follow-up" htmlFor="c-fu"><Input id="c-fu" type="date" value={c.nextFollowUp ?? ""} onChange={(e) => set({ nextFollowUp: e.target.value })} /></Field>
        <Field label="Notes" htmlFor="c-no"><Textarea id="c-no" rows={4} value={c.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        <p className="text-[12px] text-ink-3">Last contact: {c.lastContactAt ? new Date(c.lastContactAt).toLocaleString("en-IN") : "—"}. Saving records contact now.</p>
        <Button type="submit" loading={saving}>Save</Button>
      </form>
    </Card>
  );
}

export function PaymentForm({ clientId, quotes }: { clientId: string; quotes: { id: string; label: string }[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [quoteId, setQuoteId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(idempotencyKey);
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        await api(`/api/clients/${clientId}/payments`, { body: { amount, receivedOn: date, quoteId: quoteId || null, note, idempotencyKey: key } });
        router.refresh();
        setAmount(0);
        setNote("");
        setKey(idempotencyKey());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    }}>
      <Field label="Amount received" htmlFor="p-am"><MoneyInput id="p-am" value={amount} onChange={setAmount} /></Field>
      <Field label="Date" htmlFor="p-dt"><Input id="p-dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Against quotation" htmlFor="p-q">
        <Select id="p-q" value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
          <option value="">Not linked</option>
          {quotes.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
        </Select>
      </Field>
      <Field label="Note" htmlFor="p-no"><Input id="p-no" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {error && <p className="text-[13px] text-danger sm:col-span-2">{error}</p>}
      <Button type="submit" variant="secondary" loading={busy} disabled={amount <= 0} className="sm:col-span-2">Record payment</Button>
    </form>
  );
}
