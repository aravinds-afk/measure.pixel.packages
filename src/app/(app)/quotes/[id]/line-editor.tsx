"use client";

import { useState } from "react";
import { formatBand, formatINR } from "@/lib/money";
import { MODEL_FIELDS, type LineResult } from "@/lib/pricing";
import { BILLING_MODEL_LABELS, BILLING_MODELS, type BillingModel, type LineItem } from "@/lib/quote-schema";
import type { PriceOptionLike } from "@/lib/lines";
import { MoneyInput } from "@/components/money-input";
import { Badge, Card, cx, Field, Input, Select, Textarea } from "@/components/ui";

export type ServiceRef = { id: string; name: string; linkId: string; priceOptions: PriceOptionLike[] };

export function LineEditor({
  item,
  result,
  service,
  linkName,
  canOverride,
  isAdmin,
  onChange,
  onRemove,
  onMove,
}: {
  item: LineItem;
  result: LineResult | undefined;
  service: ServiceRef | undefined;
  linkName: string | undefined;
  canOverride: boolean;
  isAdmin: boolean;
  onChange: (patch: Partial<LineItem>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [more, setMore] = useState(!!(item.notes || item.internalNote));
  const f = MODEL_FIELDS[item.billingModel];
  const option = service?.priceOptions.find((o) => o.id === item.optionId);
  // Configured prices are locked for consultants; unpriced and custom lines are always editable.
  const priceLocked = item.kind === "service" && !!option && !canOverride;
  const modelLocked = item.kind === "offer" || priceLocked;
  const bands = item.bands;

  const clamp = (v: number, band: { min: number; max: number } | null | undefined) => (canOverride || !band ? v : Math.min(Math.max(v, band.min), band.max));

  return (
    <Card className={cx("p-4 sm:p-5", item.optional && "border-dashed")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {item.kind === "offer" && <Badge tone="dark">Packaged offer</Badge>}
          {item.kind === "service" && linkName && <Badge>{linkName}</Badge>}
          {item.kind === "custom" && <Badge tone="info">Custom</Badge>}
          {item.optional && <Badge tone="warn">Optional</Badge>}
          {item.priceSource === "brief-example" && <Badge tone="neutral">Example price</Badge>}
          {result?.issues.map((i) => <Badge key={i} tone="danger">{i.split(": ").pop()}</Badge>)}
          {result?.warnings.map((w) => <Badge key={w} tone="warn">{w.split(": ").pop()}</Badge>)}
        </div>
        <div className="-mt-1 flex shrink-0 items-center">
          <button aria-label="Move up" onClick={() => onMove(-1)} className="h-9 w-8 rounded text-ink-3 hover:bg-surface-2">↑</button>
          <button aria-label="Move down" onClick={() => onMove(1)} className="h-9 w-8 rounded text-ink-3 hover:bg-surface-2">↓</button>
          <button aria-label={`Remove ${item.name}`} onClick={onRemove} className="h-9 rounded px-2 text-[13px] text-danger hover:bg-danger-soft">Remove</button>
        </div>
      </div>
      <textarea aria-label="Line name" rows={1} value={item.name} onChange={(e) => onChange({ name: e.target.value.replace(/\n/g, " ") })}
        className="mt-1 w-full resize-none rounded-[6px] bg-transparent text-[17px] font-semibold leading-snug outline-none [field-sizing:content] focus:bg-surface-2" />

      {item.deliverables.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] text-ink-3">Included services — tap to remove from scope</p>
          <div className="flex flex-wrap gap-1.5">
            {item.deliverables.map((d, i) => (
              <button key={i} aria-pressed={d.included} onClick={() => onChange({ deliverables: item.deliverables.map((x, j) => (j === i ? { ...x, included: !x.included } : x)) })}
                className={cx("min-h-[32px] rounded-full border px-3 text-[13px]", d.included ? "border-ink/20 bg-surface-2" : "border-border text-ink-3 line-through")}>
                {d.label}
              </button>
            ))}
          </div>
          {item.deliverables.some((d) => !d.included) && <p className="mt-1.5 text-[12px] text-warn">Scope reduced — review the price within the band.</p>}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {service && service.priceOptions.length > 0 && (
          <Field label="Package tier" htmlFor={`opt-${item.id}`} className="col-span-2">
            <Select id={`opt-${item.id}`} value={item.optionId ?? ""} onChange={(e) => {
              const o = service.priceOptions.find((x) => x.id === e.target.value);
              if (!o) return onChange({ optionId: null, billingModel: "custom", priceSource: "manual", name: service.name });
              onChange({ optionId: o.id, name: `${service.name} — ${o.label}`, billingModel: o.model, unitPrice: o.unitPrice ?? 0, unitLabel: o.unitLabel ?? "", setupFee: o.setupFee ?? 0, monthlyFee: o.monthlyFee ?? 0, annualFee: o.annualFee ?? 0, priceSource: o.source === "brief-example" ? "brief-example" : "catalogue" });
            }}>
              {service.priceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              <option value="">Custom price</option>
            </Select>
          </Field>
        )}
        {!modelLocked && (
          <Field label="Pricing model" htmlFor={`bm-${item.id}`} className="col-span-2">
            <Select id={`bm-${item.id}`} value={item.billingModel} onChange={(e) => onChange({ billingModel: e.target.value as BillingModel })}>
              {BILLING_MODELS.map((m) => <option key={m} value={m}>{BILLING_MODEL_LABELS[m]}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Quantity" htmlFor={`q-${item.id}`}>
          <div className="flex items-center gap-1">
            <button aria-label="Decrease quantity" onClick={() => onChange({ quantity: Math.max(1, item.quantity - 1) })} className="h-11 w-10 shrink-0 rounded-[10px] border border-border bg-surface text-[18px]">−</button>
            <Input id={`q-${item.id}`} inputMode="numeric" className="num text-center" value={item.quantity} onChange={(e) => onChange({ quantity: Math.min(10000, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)) })} />
            <button aria-label="Increase quantity" onClick={() => onChange({ quantity: Math.min(10000, item.quantity + 1) })} className="h-11 w-10 shrink-0 rounded-[10px] border border-border bg-surface text-[18px]">+</button>
          </div>
        </Field>
        {f.unitPrice && (
          <Field label={item.billingModel === "per_unit" ? `Price per ${item.unitLabel || "unit"}` : item.billingModel === "third_party" ? "One-time cost" : "One-time fee"} htmlFor={`u-${item.id}`}>
            <MoneyInput id={`u-${item.id}`} value={item.unitPrice} disabled={priceLocked} onChange={(v) => onChange({ unitPrice: v })} />
          </Field>
        )}
        {f.setupFee && (
          <Field label={`${item.upfrontLabel} fee`} htmlFor={`s-${item.id}`} hint={bands ? (bands.upfront ? `Band ${formatBand(bands.upfront.min, bands.upfront.max)}` : "Included on the board") : undefined}>
            <MoneyInput id={`s-${item.id}`} value={item.setupFee} disabled={priceLocked || (item.kind === "offer" && !bands?.upfront && !canOverride)}
              onChange={(v) => onChange({ setupFee: v })} onBlur={() => item.kind === "offer" && onChange({ setupFee: clamp(item.setupFee, bands?.upfront) })} />
          </Field>
        )}
        {f.monthlyFee && (
          <Field label={item.billingModel === "ad_spend" ? "Monthly ad budget" : "Monthly fee"} htmlFor={`m-${item.id}`} hint={bands?.monthly ? `Band ${formatBand(bands.monthly.min, bands.monthly.max)}` : undefined}>
            <MoneyInput id={`m-${item.id}`} value={item.monthlyFee} disabled={priceLocked}
              onChange={(v) => onChange({ monthlyFee: v })} onBlur={() => item.kind === "offer" && onChange({ monthlyFee: clamp(item.monthlyFee, bands?.monthly) })} />
          </Field>
        )}
        {f.annualFee && (
          <Field label="Annual fee" htmlFor={`a-${item.id}`}>
            <MoneyInput id={`a-${item.id}`} value={item.annualFee} disabled={priceLocked} onChange={(v) => onChange({ annualFee: v })} />
          </Field>
        )}
        {f.monthlyFee && item.billingModel !== "ad_spend" && (
          <Field label="Fixed term (months)" htmlFor={`t-${item.id}`} hint={item.kind === "offer" && item.termMonths ? "From the board" : "Blank = ongoing"}>
            <Input id={`t-${item.id}`} inputMode="numeric" className="num" value={item.termMonths ?? ""} disabled={item.kind === "offer" && !canOverride}
              onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); onChange({ termMonths: n ? Math.min(120, n) : null }); }} />
          </Field>
        )}
        {item.billingModel === "per_unit" && (
          <Field label="Unit name" htmlFor={`ul-${item.id}`}><Input id={`ul-${item.id}`} value={item.unitLabel} onChange={(e) => onChange({ unitLabel: e.target.value.slice(0, 40) })} placeholder="video" /></Field>
        )}
      </div>
      {priceLocked && <p className="mt-2 text-[12px] text-ink-3">Configured price. Changing it needs price-override permission (Settings → Users).</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <label className="flex min-h-[36px] items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={item.optional} onChange={(e) => onChange({ optional: e.target.checked })} />
          Optional add-on (not in totals)
        </label>
        <LineTotal r={result} optional={item.optional} />
      </div>

      <button onClick={() => setMore(!more)} className="mt-1 text-[13px] font-medium text-ink-2 hover:text-ink">{more ? "Hide notes" : "+ Notes"}</button>
      {more && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Note for the client" htmlFor={`cn-${item.id}`}><Textarea id={`cn-${item.id}`} rows={2} value={item.notes} onChange={(e) => onChange({ notes: e.target.value })} /></Field>
          <Field label="Internal note" htmlFor={`in-${item.id}`} hint="Never shown to the client"><Textarea id={`in-${item.id}`} rows={2} value={item.internalNote} onChange={(e) => onChange({ internalNote: e.target.value })} /></Field>
          {item.kind === "offer" && (
            <Field label="Description for the client" htmlFor={`d-${item.id}`} className="sm:col-span-2"><Textarea id={`d-${item.id}`} rows={2} value={item.description} onChange={(e) => onChange({ description: e.target.value })} /></Field>
          )}
          {isAdmin && (
            <>
              <Field label="Delivery cost — one-time (internal)" htmlFor={`dc1-${item.id}`} hint={item.kind !== "custom" ? "From the catalogue" : undefined}>
                <MoneyInput id={`dc1-${item.id}`} value={item.deliveryCostOneTime} disabled={item.kind !== "custom"} onChange={(v) => onChange({ deliveryCostOneTime: v })} />
              </Field>
              <Field label="Delivery cost — monthly (internal)" htmlFor={`dc2-${item.id}`}>
                <MoneyInput id={`dc2-${item.id}`} value={item.deliveryCostMonthly} disabled={item.kind !== "custom"} onChange={(v) => onChange({ deliveryCostMonthly: v })} />
              </Field>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function LineTotal({ r, optional }: { r: LineResult | undefined; optional: boolean }) {
  if (!r) return null;
  const parts = [
    r.oneTime ? formatINR(r.oneTime) : null,
    r.monthly ? `${formatINR(r.monthly)}/mo` : null,
    r.annual ? `${formatINR(r.annual)}/yr` : null,
    r.adSpendMonthly ? `${formatINR(r.adSpendMonthly)}/mo ad budget` : null,
    r.thirdPartyOneTime ? `${formatINR(r.thirdPartyOneTime)} third-party` : null,
    r.thirdPartyMonthly ? `${formatINR(r.thirdPartyMonthly)}/mo third-party` : null,
  ].filter(Boolean);
  return (
    <p className={cx("num text-right text-[15px] font-semibold", optional && "text-ink-3")}>
      {parts.length ? parts.join(" + ") : "—"}
    </p>
  );
}
