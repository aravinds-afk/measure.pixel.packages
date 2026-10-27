"use client";

import { useMemo, useState } from "react";
import { newId } from "@/lib/ids";
import { Badge, Button, Card, cx, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { STATUS_OPTIONS, statusLabel, type AuditState, type CustomItem, type Ref, type Response, type Status } from "./types";

type Item = Ref["items"][number] & { custom?: boolean };

export function ChecklistStep({
  audit,
  ref_,
  updateResponse,
  updateAudit,
  onComplete,
  onNext,
}: {
  audit: AuditState;
  ref_: Ref;
  updateResponse: (id: string, p: Partial<Response>) => void;
  updateAudit: (p: Partial<AuditState>) => void;
  onComplete: () => Promise<void>;
  onNext: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | "gaps" | "open">("all");
  const [completing, setCompleting] = useState(false);
  const items: Item[] = useMemo(() => [...ref_.items, ...audit.customItems.map((c) => ({ ...c, help: "", custom: true }))], [ref_.items, audit.customItems]);
  const statusOf = (id: string): Status => audit.responses[id]?.status ?? "not_assessed";
  const assessed = items.filter((i) => statusOf(i.id) !== "not_assessed").length;
  const highGaps = items.filter((i) => i.priority === "high" && (statusOf(i.id) === "missing" || statusOf(i.id) === "needs_improvement"));
  const suggestions = items.filter((i) => audit.responses[i.id]?.suggestion && statusOf(i.id) === "not_assessed").length;

  const visible = (i: Item) =>
    filter === "all" || (filter === "gaps" ? ["missing", "needs_improvement"].includes(statusOf(i.id)) : statusOf(i.id) === "not_assessed");

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Progress</p>
            <p className="text-[15px]"><span className="num text-[22px] font-semibold">{assessed}</span><span className="text-ink-3"> / {items.length} assessed</span></p>
          </div>
          <div className="flex gap-1 rounded-[10px] bg-surface-2 p-1 text-[13px]">
            {(["all", "open", "gaps"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cx("min-h-[32px] rounded-[8px] px-3 font-medium", filter === f ? "bg-surface shadow-sm" : "text-ink-2")}>
                {f === "all" ? "All" : f === "open" ? "Not assessed" : "Gaps"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={assessed} aria-valuemax={items.length} aria-label="Audit completion">
          <div className="h-full bg-ink transition-[width]" style={{ width: `${(assessed / Math.max(1, items.length)) * 100}%` }} />
        </div>
        {highGaps.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium text-danger">High-priority gaps ({highGaps.length})</p>
            <div className="flex flex-wrap gap-1.5">{highGaps.map((g) => <Badge key={g.id} tone="danger">{g.label}</Badge>)}</div>
          </div>
        )}
        {suggestions > 0 && <p className="mt-3 text-[13px] text-ink-2">{suggestions} item(s) have a suggestion from the website. Accept or set your own status.</p>}
      </Card>

      {ref_.categories.map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        const done = catItems.filter((i) => statusOf(i.id) !== "not_assessed").length;
        const gaps = catItems.filter((i) => ["missing", "needs_improvement"].includes(statusOf(i.id))).length;
        const shown = catItems.filter(visible);
        if (filter !== "all" && shown.length === 0) return null;
        return (
          <details key={cat.id} className="card group overflow-hidden" open={filter !== "all" || undefined}>
            <summary className="flex min-h-[60px] items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-[16px] font-semibold">{cat.name}</p>
                <p className="text-[13px] text-ink-3">{done}/{catItems.length} assessed{gaps ? ` · ${gaps} gap${gaps > 1 ? "s" : ""}` : ""}</p>
              </div>
              <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {shown.map((item) => (
                <ChecklistItem key={item.id} item={item} r={audit.responses[item.id]} onChange={(p) => updateResponse(item.id, p)}
                  onRemove={item.custom ? () => updateAudit({ customItems: audit.customItems.filter((c) => c.id !== item.id) }) : undefined} />
              ))}
            </ul>
            <AddItem categoryId={cat.id} services={ref_.services} onAdd={(c) => updateAudit({ customItems: [...audit.customItems, c] })} />
          </details>
        );
      })}

      <Card className="p-5">
        <Field label="Consultant notes" htmlFor="cn" hint="Internal. Not shown to the client.">
          <Textarea id="cn" value={audit.consultantNotes} onChange={(e) => updateAudit({ consultantNotes: e.target.value })} rows={4} />
        </Field>
      </Card>

      <div className="no-print fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0">
        <Button variant="secondary" size="lg" className="flex-1 lg:flex-none" onClick={() => void onNext()}>Save draft & recommend</Button>
        <Button size="lg" className="flex-1 lg:flex-none" loading={completing} onClick={async () => { setCompleting(true); await onComplete(); setCompleting(false); }}>
          Complete audit
        </Button>
      </div>
    </div>
  );
}

function ChecklistItem({ item, r, onChange, onRemove }: { item: Item; r: Response | undefined; onChange: (p: Partial<Response>) => void; onRemove?: () => void }) {
  const status = r?.status ?? "not_assessed";
  const [open, setOpen] = useState(!!(r?.notes || r?.evidence));
  const sug = r?.suggestion;
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug">{item.label}</p>
          {item.help && <p className="mt-0.5 text-[13px] text-ink-3">{item.help}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {item.priority === "high" && <Badge tone="danger">High</Badge>}
          {item.custom && <Badge tone="info">Custom</Badge>}
          {r?.source === "auto-verified" && <Badge tone="ok">Verified on site</Badge>}
          {r?.confirmedByClient && <Badge tone="dark">Client confirmed</Badge>}
        </div>
      </div>

      <div role="radiogroup" aria-label={`Status for ${item.label}`} className="mt-3 flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={status === o.value} onClick={() => onChange({ status: o.value, suggestion: o.value === "not_assessed" ? sug : null })}
            className={cx("min-h-[36px] rounded-full border px-3 text-[13px] font-medium", status === o.value ? o.tone : "border-border bg-surface text-ink-2 hover:border-border-strong")}>
            {o.short}
          </button>
        ))}
      </div>

      {sug && status === "not_assessed" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] bg-warn-soft px-3 py-2 text-[13px]">
          <span className="text-warn">Suggested: <strong>{statusLabel(sug.status)}</strong> — {sug.note}</span>
          <Button size="sm" variant="secondary" onClick={() => onChange({ status: sug.status as Status, suggestion: null, evidence: r?.evidence || sug.evidence })}>Accept</Button>
        </div>
      )}
      {r?.evidence && !open && <p className="mt-2 break-words text-[12px] text-ink-3">Evidence: {r.evidence}</p>}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <button type="button" onClick={() => setOpen(!open)} className="font-medium text-ink-2 hover:text-ink">{open ? "Hide notes" : r?.notes ? "Notes ✎" : "+ Notes / evidence"}</button>
        <label className="flex min-h-[28px] items-center gap-2 text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={!!r?.confirmedByClient} onChange={(e) => onChange({ confirmedByClient: e.target.checked, status })} />
          Confirmed by client
        </label>
        {onRemove && <button type="button" onClick={onRemove} className="text-danger">Remove item</button>}
      </div>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Notes" htmlFor={`n-${item.id}`}><Textarea id={`n-${item.id}`} rows={2} value={r?.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value, status })} /></Field>
          <Field label="Evidence reference" htmlFor={`e-${item.id}`} hint="URL, screenshot name or who said it"><Input id={`e-${item.id}`} value={r?.evidence ?? ""} onChange={(e) => onChange({ evidence: e.target.value, status })} /></Field>
        </div>
      )}
    </li>
  );
}

function AddItem({ categoryId, services, onAdd }: { categoryId: string; services: Ref["services"]; onAdd: (c: CustomItem) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState<CustomItem["priority"]>("medium");
  const [serviceId, setServiceId] = useState("");
  if (!open)
    return (
      <div className="border-t border-border px-5 py-3">
        <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-medium text-ink-2 hover:text-ink">+ Add checklist item</button>
      </div>
    );
  return (
    <div className="flex flex-col gap-3 border-t border-border bg-surface-2/50 px-5 py-4">
      <Field label="New item" htmlFor={`add-${categoryId}`}><Input id={`add-${categoryId}`} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What to check" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Priority" htmlFor={`p-${categoryId}`}>
          <Select id={`p-${categoryId}`} value={priority} onChange={(e) => setPriority(e.target.value as CustomItem["priority"])}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Solved by (for recommendations)" htmlFor={`s-${categoryId}`}>
          <Select id={`s-${categoryId}`} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">No service</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </div>
      {!label.trim() && <Notice tone="info">Custom items stay with this audit only. Add permanent items in Settings → Audit checklist.</Notice>}
      <div className="flex gap-2">
        <Button size="sm" disabled={!label.trim()} onClick={() => { onAdd({ id: newId("CI", 6), categoryId, label: label.trim(), priority, serviceIds: serviceId ? [serviceId] : [] }); setLabel(""); setOpen(false); }}>Add</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
