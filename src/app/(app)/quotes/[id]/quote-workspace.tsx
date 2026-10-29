"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, idempotencyKey } from "@/lib/api-client";
import { toClientView } from "@/lib/client-view";
import { customLine, lineFromOffer, lineFromService, type OfferLike, type PriceOptionLike } from "@/lib/lines";
import { computeTotals, type QuoteTotals } from "@/lib/pricing";
import type { LineItem, QuoteDoc, QuoteStatus } from "@/lib/quote-schema";
import { quoteSummaryText } from "@/lib/summary";
import { ClientQuote } from "@/components/quote/client-view";
import { useToast } from "@/components/toast";
import { Badge, Button, buttonClass, Card, cx, Empty, Notice, Segmented } from "@/components/ui";
import { CatalogueDrawer, type DrawerOffer, type DrawerService } from "./catalogue-drawer";
import { LineEditor } from "./line-editor";
import { QuoteSettings } from "./quote-settings";
import { MobileTotalsBar, TotalsBreakdown } from "./totals-panel";

export type QuoteWorkspaceProps = {
  quote: {
    id: string;
    number: string;
    version: number;
    status: QuoteStatus;
    storedStatus: QuoteStatus;
    rev: number;
    issueDate: string | null;
    validUntil: string | null;
    publicToken: string | null;
    auditId: string | null;
    clientId: string;
    updatedAt: string;
  };
  doc: QuoteDoc;
  serverTotals: QuoteTotals;
  versions: { id: string; version: number; status: QuoteStatus }[];
  sheets: { status: string; error: string | null; at: string } | null;
  offers: (OfferLike & { number: number; clusterId: string | null; audienceLabel: string; buyerQuote: string })[];
  services: { id: string; name: string; description: string; linkId: string; industryIds: string[]; priceOptions: PriceOptionLike[]; deliveryCostOneTime: number; deliveryCostMonthly: number }[];
  links: { id: string; name: string }[];
  industries: { id: string; name: string; clusterId: string }[];
  clusters: { id: string; name: string }[];
  company: { name: string; email: string; phone: string; website: string; address: string; gstin: string };
  maxDiscountPercent: number;
  user: { role: "admin" | "consultant"; canOverridePrices: boolean };
  appUrl: string;
};

const STATUS_TONE: Record<QuoteStatus, "neutral" | "info" | "ok" | "danger" | "warn" | "dark"> = {
  draft: "neutral",
  presented: "info",
  sent: "info",
  accepted: "ok",
  rejected: "danger",
  expired: "warn",
};

type SaveState = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

export function QuoteWorkspace(props: QuoteWorkspaceProps) {
  const router = useRouter();
  const toast = useToast();
  const [doc, setDoc] = useState<QuoteDoc>(props.doc);
  const [mode, setMode] = useState<"internal" | "client">("internal");
  const [drawer, setDrawer] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [busy, setBusy] = useState<string | null>(null);
  const [sheets, setSheets] = useState(props.sheets);
  const [token, setToken] = useState(props.quote.publicToken);
  const q = props.quote;
  const editable = q.storedStatus === "draft";
  const isAdmin = props.user.role === "admin";

  const totals = useMemo(() => computeTotals(doc), [doc]);

  // ---- Autosave (drafts only)
  const rev = useRef(q.rev);
  const latest = useRef(doc);
  latest.current = doc;
  const dirty = useRef(false);
  const inflight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async (): Promise<boolean> => {
    if (!editable) return true;
    if (timer.current) clearTimeout(timer.current);
    if (inflight.current) {
      dirty.current = true;
      return false;
    }
    if (!dirty.current) return true;
    inflight.current = true;
    dirty.current = false;
    setSave({ kind: "saving" });
    const d = latest.current;
    const t = computeTotals(d);
    let ok = false;
    try {
      const res = await api<{ rev: number }>(`/api/quotes/${q.id}`, {
        method: "PUT",
        body: { rev: rev.current, doc: d, expectedTotals: { oneTimeTotal: t.oneTimeTotal, monthlyTotal: t.monthlyTotal, annualTotal: t.annualTotal, initialPaymentDue: t.initialPaymentDue } },
      });
      rev.current = res.rev;
      ok = true;
      setSave({ kind: "saved" });
    } catch (e) {
      // Keep the changes marked unsaved; the next edit retries. 403s need the consultant to fix the price first.
      dirty.current = true;
      setSave({ kind: "error", message: (e as Error).message });
    } finally {
      inflight.current = false;
    }
    if (ok && dirty.current) timer.current = setTimeout(() => void flush(), 500);
    return ok;
  }, [editable, q.id]);

  const update = useCallback(
    (patch: Partial<QuoteDoc> | ((d: QuoteDoc) => QuoteDoc)) => {
      if (!editable) return;
      setDoc((d) => (typeof patch === "function" ? patch(d) : { ...d, ...patch }));
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 900);
    },
    [editable, flush],
  );

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current || inflight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const updateItem = (id: string, patch: Partial<LineItem>) => update((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const removeItem = (id: string) => update((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
  const moveItem = (id: string, dir: -1 | 1) =>
    update((d) => {
      const idx = d.items.findIndex((i) => i.id === id);
      const to = idx + dir;
      if (to < 0 || to >= d.items.length) return d;
      const items = [...d.items];
      [items[idx], items[to]] = [items[to], items[idx]];
      return { ...d, items };
    });
  const addItem = (item: LineItem) => {
    update((d) => {
      const next = { ...d, items: [...d.items, item] };
      if (item.termMonths && !d.billing.contractMonths) next.billing = { ...d.billing, contractMonths: item.termMonths };
      return next;
    });
    toast("ok", `Added ${item.name}`);
  };

  const inCart = useMemo(() => new Set(doc.items.flatMap((i) => [i.offerId ? `offer:${i.offerId}` : "", i.serviceId ? `service:${i.serviceId}` : ""]).filter(Boolean)), [doc.items]);
  const clientView = useMemo(
    () => toClientView({ number: q.number, version: q.version, status: q.status, issueDate: q.issueDate, validUntil: q.validUntil }, doc, props.company),
    [doc, q, props.company],
  );
  const shareUrl = token && props.appUrl ? `${props.appUrl}/q/${token}` : token ? `${typeof window !== "undefined" ? window.location.origin : ""}/q/${token}` : null;

  // ---- Actions
  const act = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try {
      await fn();
    } catch (e) {
      toast("danger", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sheetsToast = (sync: { status: string; error?: string }, ok: string) => {
    setSheets({ status: sync.status === "synced" ? "done" : sync.status === "failed" ? "failed" : "pending", error: sync.error ?? null, at: new Date().toISOString() });
    if (sync.status === "synced") toast("ok", `${ok} Recorded in Google Sheets.`);
    else if (sync.status === "not_configured") toast("warn", `${ok} Google Sheets is not configured yet — saved in the database only.`);
    else toast("warn", `${ok} Google Sheets write ${sync.status}: ${sync.error ?? "queued"}. It will retry.`);
  };

  const changeStatus = (to: "presented" | "sent" | "accepted" | "rejected", then?: () => void) =>
    act(to, async () => {
      if (!(await flush())) throw new Error("Save failed — fix the highlighted issue first.");
      const res = await api<{ status: QuoteStatus; sync: { status: string; error?: string } }>(`/api/quotes/${q.id}/status`, { body: { from: q.storedStatus, to } });
      sheetsToast(res.sync, `Quotation marked ${res.status}.`);
      then?.();
      router.refresh();
    });

  const revise = () =>
    act("revise", async () => {
      const res = await api<{ quoteId: string }>(`/api/quotes/${q.id}/revise`, { body: { idempotencyKey: idempotencyKey() } });
      router.push(`/quotes/${res.quoteId}`);
    });

  const share = (enabled: boolean) =>
    act("share", async () => {
      const res = await api<{ token: string | null; sync: { status: string; error?: string } }>(`/api/quotes/${q.id}/share`, { body: { enabled } });
      setToken(res.token);
      if (enabled && res.token) {
        const url = `${props.appUrl || window.location.origin}/q/${res.token}`;
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast("ok", "Secure link created and copied.");
      } else toast("ok", "Link disabled. The old URL no longer works.");
    });

  const syncSheets = () =>
    act("sync", async () => {
      await flush();
      const res = await api<{ results: Record<string, { status: string; error?: string }> }>(`/api/quotes/${q.id}/sync`, { body: {} });
      const failed = Object.entries(res.results).filter(([, r]) => r.status !== "synced");
      if (failed.length === 0) sheetsToast({ status: "synced" }, "Saved.");
      else sheetsToast(failed[0][1], `Saved to the database.`);
    });

  const copySummary = async () => {
    const text = quoteSummaryText(clientView, shareUrl ?? undefined);
    try {
      await navigator.clipboard.writeText(text);
      toast("ok", "Summary copied — paste into WhatsApp or email.");
    } catch {
      toast("danger", "Copy failed. Your browser blocked clipboard access.");
    }
  };

  const issues = totals.issues;
  const later = props.versions.find((v) => v.version > q.version);

  return (
    <div className={cx(editable && "pb-24 lg:pb-0")}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5 flex flex-wrap items-center gap-2">
              <span className="num">{q.number}</span> · v{q.version} <Badge tone={STATUS_TONE[q.status]}>{q.status}</Badge>
            </p>
            <h1 className="truncate text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]">{doc.client.businessName || "Untitled"}</h1>
            <p aria-live="polite" className={cx("mt-1 text-[13px]", save.kind === "error" ? "text-danger" : "text-ink-3")}>
              {editable
                ? save.kind === "saving" ? "Saving…" : save.kind === "saved" ? "All changes saved" : save.kind === "error" ? `Not saved — ${save.message}` : "Draft · changes save automatically"
                : `Issued ${q.issueDate ?? ""} · valid until ${q.validUntil ?? ""} · locked`}
              {sheets && <> · Sheets: {sheets.status === "done" ? "synced" : sheets.status === "failed" ? `failed (${sheets.error ?? "error"})` : "pending"}</>}
            </p>
          </div>
          <Segmented label="View mode" value={mode} onChange={setMode} options={[{ value: "internal", label: "Internal" }, { value: "client", label: "Client view" }]} />
        </div>

        {later && <Notice tone="info">A newer version exists: <Link className="font-medium underline" href={`/quotes/${later.id}`}>v{later.version} ({later.status})</Link>. This version is kept unchanged.</Notice>}

        <div className="no-print flex flex-wrap gap-2">
          {editable && (
            <>
              <Button onClick={() => changeStatus("presented", () => router.push(`/quotes/${q.id}/present`))} loading={busy === "presented"} disabled={issues.length > 0}>Issue & present</Button>
              <Button variant="secondary" onClick={() => changeStatus("sent")} loading={busy === "sent"} disabled={issues.length > 0}>Issue as sent</Button>
            </>
          )}
          {(q.status === "presented" || q.status === "sent") && (
            <>
              <Button variant="accent" onClick={() => changeStatus("accepted")} loading={busy === "accepted"}>Mark accepted</Button>
              <Button variant="secondary" onClick={() => changeStatus("rejected")} loading={busy === "rejected"}>Mark rejected</Button>
              {q.status === "presented" && <Button variant="secondary" onClick={() => changeStatus("sent")} loading={busy === "sent"}>Mark sent</Button>}
            </>
          )}
          {!editable && <Link className={buttonClass("secondary")} href={`/quotes/${q.id}/present`}>Present</Link>}
          <a className={buttonClass("secondary")} href={`/api/quotes/${q.id}/pdf`} onClick={async (e) => { if (editable && dirty.current) { e.preventDefault(); if (await flush()) window.location.href = `/api/quotes/${q.id}/pdf`; } }}>PDF</a>
          <Button variant="secondary" onClick={copySummary}>Copy summary</Button>
          {!editable && (token ? (
            <>
              <Button variant="secondary" onClick={async () => { await navigator.clipboard?.writeText(shareUrl!).catch(() => {}); toast("ok", "Link copied."); }}>Copy link</Button>
              <Button variant="ghost" onClick={() => share(false)} loading={busy === "share"}>Disable link</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => share(true)} loading={busy === "share"}>Create secure link</Button>
          ))}
          {!editable && !later && <Button variant="secondary" onClick={revise} loading={busy === "revise"}>Revise (new version)</Button>}
          <Button variant="ghost" onClick={syncSheets} loading={busy === "sync"}>Save to Google Sheets</Button>
        </div>
        {editable && issues.length > 0 && <Notice tone="warn" title="Before issuing">{issues.join(" · ")}</Notice>}
        {editable && totals.warnings.length > 0 && <Notice tone="info">{totals.warnings.join(" · ")}</Notice>}
      </div>

      {mode === "client" ? (
        <ClientQuote v={clientView} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            {doc.items.length === 0 && <Empty title="No services yet" body="Add packaged offers or individual services from the five links." />}
            {editable ? (
              doc.items.map((item, i) => (
                <LineEditor
                  key={item.id}
                  item={item}
                  result={totals.lines[i]}
                  service={item.serviceId ? props.services.find((s) => s.id === item.serviceId) : undefined}
                  linkName={props.links.find((l) => l.id === props.services.find((s) => s.id === item.serviceId)?.linkId)?.name}
                  canOverride={props.user.canOverridePrices}
                  isAdmin={isAdmin}
                  onChange={(p) => updateItem(item.id, p)}
                  onRemove={() => removeItem(item.id)}
                  onMove={(d) => moveItem(item.id, d)}
                />
              ))
            ) : (
              <LockedItems doc={doc} />
            )}
            {editable && (
              <button onClick={() => setDrawer(true)} className="min-h-[56px] rounded-[14px] border border-dashed border-border-strong text-[15px] font-medium text-ink-2 hover:border-ink hover:text-ink">
                + Add services
              </button>
            )}
            {editable ? <QuoteSettings doc={doc} update={update} isAdmin={isAdmin} maxDiscountPercent={props.maxDiscountPercent} /> : doc.internalNotes && <Card className="p-5"><p className="eyebrow mb-2">Internal notes</p><p className="whitespace-pre-line text-[14px]">{doc.internalNotes}</p></Card>}
            {props.versions.length > 1 && (
              <Card className="p-5">
                <p className="eyebrow mb-2">Versions</p>
                <ul className="flex flex-col gap-1 text-[14px]">
                  {props.versions.map((v) => (
                    <li key={v.id}>
                      {v.id === q.id ? <strong>v{v.version} (this)</strong> : <Link href={`/quotes/${v.id}`} className="underline underline-offset-2">v{v.version}</Link>} · {v.status}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {q.auditId && <Link href={`/audits/${q.auditId}?step=recommend`} className="text-[14px] text-ink-2 underline underline-offset-2">← Back to audit recommendations</Link>}
          </div>
          <aside className="hidden lg:block">
            <div className="card sticky top-6 p-5">
              <p className="mb-3 text-[16px] font-semibold">Investment</p>
              <TotalsBreakdown t={totals} showInternal={isAdmin} taxLabel={doc.tax.label} contractMonths={doc.billing.contractMonths} />
            </div>
          </aside>
        </div>
      )}

      <MobileTotalsBar t={totals} taxLabel={doc.tax.label} contractMonths={doc.billing.contractMonths} showInternal={isAdmin} />

      <CatalogueDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        offers={props.offers as DrawerOffer[]}
        services={props.services as DrawerService[]}
        links={props.links}
        industries={props.industries}
        clusters={props.clusters}
        inCart={inCart}
        onAddOffer={(o) => addItem(lineFromOffer(o))}
        onAddService={(s, optionId) => addItem(lineFromService(props.services.find((x) => x.id === s.id)!, optionId))}
        onAddCustom={() => { addItem(customLine()); setDrawer(false); }}
      />
    </div>
  );
}

function LockedItems({ doc }: { doc: QuoteDoc }) {
  const t = computeTotals(doc);
  return (
    <Card className="divide-y divide-border">
      {doc.items.map((i, k) => (
        <div key={i.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium">{i.name} {i.optional && <Badge tone="warn">Optional</Badge>}</p>
            {i.deliverables.length > 0 && <p className="text-[13px] text-ink-3">{i.deliverables.filter((d) => d.included).map((d) => d.label).join(" · ")}</p>}
            {i.internalNote && <p className="mt-1 text-[13px] text-warn">Internal: {i.internalNote}</p>}
          </div>
          <p className="num shrink-0 text-[14px] font-semibold">
            {[t.lines[k].oneTime && `₹${(t.lines[k].oneTime / 100).toLocaleString("en-IN")}`, t.lines[k].monthly && `₹${(t.lines[k].monthly / 100).toLocaleString("en-IN")}/mo`, t.lines[k].annual && `₹${(t.lines[k].annual / 100).toLocaleString("en-IN")}/yr`, t.lines[k].adSpendMonthly && `₹${(t.lines[k].adSpendMonthly / 100).toLocaleString("en-IN")}/mo ads`].filter(Boolean).join(" + ") || "—"}
          </p>
        </div>
      ))}
    </Card>
  );
}
