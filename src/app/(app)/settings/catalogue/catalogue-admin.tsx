"use client";

import { useState } from "react";
import { MultiSelect, useAdminSave } from "@/components/admin";
import { MoneyInput } from "@/components/money-input";
import { Badge, Button, Card, Field, Input, Notice, Segmented, Select, Textarea } from "@/components/ui";
import { formatBand } from "@/lib/money";
import type { CatalogRows } from "@/server/catalog";

type Svc = CatalogRows["services"][number];
type Off = CatalogRows["offers"][number];
type Ind = CatalogRows["industries"][number];
type Props = { services: Svc[]; offers: Off[]; industries: Ind[]; links: CatalogRows["links"]; clusters: CatalogRows["clusters"] };

const MODELS = [
  ["per_unit", "Per unit"], ["fixed_project", "Fixed project fee"], ["fixed_package", "Fixed package"], ["setup_plus_monthly", "Setup + monthly"], ["monthly", "Monthly"], ["annual", "Annual subscription"], ["custom", "Custom quotation"],
] as const;

export function CatalogueAdmin(p: Props) {
  const [tab, setTab] = useState<"offers" | "services" | "industries">("offers");
  return (
    <div className="flex flex-col gap-4">
      <Segmented label="Catalogue area" value={tab} onChange={setTab} options={[{ value: "offers", label: `Offers (${p.offers.length})` }, { value: "services", label: `Services (${p.services.length})` }, { value: "industries", label: `Industries (${p.industries.length})` }]} />
      <Notice tone="info">Board records keep their original Opportunity Board values (shown as “Board:”). Edits are overrides; “Restore board values” undoes them. Deactivate instead of deleting — quotations keep their snapshots either way.</Notice>
      {tab === "offers" && p.offers.map((o) => <OfferEditor key={o.id} o={o} {...p} />)}
      {tab === "offers" && <NewOffer next={Math.max(0, ...p.offers.map((o) => o.number)) + 1} order={p.offers.length} />}
      {tab === "services" && p.links.map((l) => (
        <section key={l.id}>
          <p className="eyebrow mb-2 mt-4">{l.name}</p>
          <div className="flex flex-col gap-2">{p.services.filter((s) => s.linkId === l.id).map((s) => <ServiceEditor key={s.id} s={s} {...p} />)}</div>
        </section>
      ))}
      {tab === "services" && <NewService links={p.links} order={p.services.length} />}
      {tab === "industries" && p.clusters.map((c) => (
        <section key={c.id}>
          <p className="eyebrow mb-2 mt-4">{c.name}</p>
          <div className="flex flex-col gap-2">{p.industries.filter((i) => i.clusterId === c.id).map((i) => <IndustryEditor key={i.id} i={i} clusters={p.clusters} />)}</div>
        </section>
      ))}
      {tab === "industries" && <NewIndustry clusters={p.clusters} order={p.industries.length} />}
    </div>
  );
}

function Row({ title, meta, children, active }: { title: string; meta?: React.ReactNode; children: React.ReactNode; active: boolean }) {
  return (
    <details className="card">
      <summary className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
        <span className={active ? "font-medium" : "font-medium text-ink-3 line-through"}>{title}</span>
        <span className="flex items-center gap-2 text-[12px] text-ink-3">{meta}</span>
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}

function ServiceEditor({ s, industries, links }: { s: Svc } & Props) {
  const [v, setV] = useState(s);
  const { save, reset, busy } = useAdminSave("services");
  const set = (p: Partial<Svc>) => setV((x) => ({ ...x, ...p }));
  const src = s.sourceSnapshot as { name?: string } | null;
  return (
    <Row title={s.name} active={s.active} meta={<>{s.priceOptions.length ? <Badge>{s.priceOptions.length} price option{s.priceOptions.length > 1 ? "s" : ""}</Badge> : <Badge tone="warn">Price not configured</Badge>}{s.origin === "opportunity_board" && <Badge tone="accent">Board</Badge>}</>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor={`sn-${s.id}`} hint={src?.name && src.name !== v.name ? `Board: ${src.name}` : undefined}><Input id={`sn-${s.id}`} value={v.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Service link" htmlFor={`sl-${s.id}`}><Select id={`sl-${s.id}`} value={v.linkId} onChange={(e) => set({ linkId: e.target.value })}>{links.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
        <Field label="Description (client-facing)" htmlFor={`sd-${s.id}`} className="sm:col-span-2" hint="The board does not describe deliverables; add yours."><Textarea id={`sd-${s.id}`} rows={2} value={v.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <Field label="Industry relevance (none selected = all)" htmlFor={`si-${s.id}`}><MultiSelect label="Industries" value={v.industryIds} onChange={(x) => set({ industryIds: x })} options={industries.map((i) => ({ value: i.id, label: i.name }))} /></Field>
        <div className="grid gap-3">
          <Field label="Default pricing model" htmlFor={`sm-${s.id}`}><Select id={`sm-${s.id}`} value={v.defaultModel} onChange={(e) => set({ defaultModel: e.target.value })}>{MODELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Delivery cost one-time (internal)" htmlFor={`dc1-${s.id}`}><MoneyInput id={`dc1-${s.id}`} value={v.deliveryCostOneTime} onChange={(x) => set({ deliveryCostOneTime: x })} /></Field>
          <Field label="Delivery cost monthly (internal)" htmlFor={`dc2-${s.id}`}><MoneyInput id={`dc2-${s.id}`} value={v.deliveryCostMonthly} onChange={(x) => set({ deliveryCostMonthly: x })} /></Field>
        </div>
      </div>
      <p className="mb-2 mt-4 text-[14px] font-semibold">Price options / tiers</p>
      <div className="flex flex-col gap-2">
        {v.priceOptions.map((o, i) => (
          <div key={i} className="grid gap-2 rounded-[10px] bg-surface-2 p-3 sm:grid-cols-6">
            <Input aria-label="Option label" className="sm:col-span-2" value={o.label} onChange={(e) => set({ priceOptions: v.priceOptions.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <Select aria-label="Model" value={o.model} onChange={(e) => set({ priceOptions: v.priceOptions.map((x, j) => (j === i ? { ...x, model: e.target.value as typeof o.model } : x)) })}>{MODELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            {(o.model === "per_unit" || o.model === "fixed_project" || o.model === "fixed_package" || o.model === "custom") && <MoneyInput ariaLabel="Unit or one-time price" value={o.unitPrice ?? 0} onChange={(n) => set({ priceOptions: v.priceOptions.map((x, j) => (j === i ? { ...x, unitPrice: n } : x)) })} />}
            {o.model === "per_unit" && <Input aria-label="Unit label" placeholder="unit" value={o.unitLabel ?? ""} onChange={(e) => set({ priceOptions: v.priceOptions.map((x, j) => (j === i ? { ...x, unitLabel: e.target.value } : x)) })} />}
            {o.model === "setup_plus_monthly" && <MoneyInput ariaLabel="Setup fee" value={o.setupFee ?? 0} onChange={(n) => set({ priceOptions: v.priceOptions.map((x, j) => (j === i ? { ...x, setupFee: n } : x)) })} />}
            {(o.model === "monthly" || o.model === "setup_plus_monthly" || o.model === "custom") && <MoneyInput ariaLabel="Monthly fee" value={o.monthlyFee ?? 0} onChange={(n) => set({ priceOptions: v.priceOptions.map((x, j) => (j === i ? { ...x, monthlyFee: n } : x)) })} />}
            {o.model === "annual" && <MoneyInput ariaLabel="Annual fee" value={o.annualFee ?? 0} onChange={(n) => set({ priceOptions: v.priceOptions.map((x, j) => (j === i ? { ...x, annualFee: n } : x)) })} />}
            <div className="flex items-center justify-between gap-2 sm:col-span-6">
              <span className="text-[12px] text-ink-3">{o.source === "brief-example" ? "Example price from the build brief — not an approved list price" : "Admin price"}</span>
              <Button size="sm" variant="ghost" onClick={() => set({ priceOptions: v.priceOptions.filter((_, j) => j !== i) })}>Remove</Button>
            </div>
          </div>
        ))}
        <Button size="sm" variant="secondary" className="self-start" onClick={() => set({ priceOptions: [...v.priceOptions, { id: `opt-${Date.now().toString(36)}`, label: "New tier", model: "monthly", monthlyFee: 0, source: "admin" }] })}>+ Add price option</Button>
      </div>
      <Actions active={v.active} onToggle={() => set({ active: !v.active })} order={v.sortOrder} onOrder={(n) => set({ sortOrder: n })} busy={busy}
        onSave={() => save({ id: v.id, name: v.name, linkId: v.linkId, description: v.description, industryIds: v.industryIds, defaultModel: v.defaultModel, priceOptions: v.priceOptions.map((o) => ({ ...o, source: o.source ?? "admin" })), deliveryCostOneTime: v.deliveryCostOneTime, deliveryCostMonthly: v.deliveryCostMonthly, active: v.active, sortOrder: v.sortOrder })}
        onReset={s.origin === "opportunity_board" ? () => reset(s.id) : undefined} />
    </Row>
  );
}

function OfferEditor({ o, industries, clusters, services }: { o: Off } & Props) {
  const [v, setV] = useState(o);
  const { save, reset, busy } = useAdminSave("offers");
  const set = (p: Partial<Off>) => setV((x) => ({ ...x, ...p }));
  const src = o.sourceSnapshot as { upfront?: { min: number; max: number } | null; monthly?: { min: number; max: number } | null; name?: string } | null;
  const bandText = (b?: { min: number; max: number } | null) => (b ? formatBand(b.min * 100, b.max * 100) : "—");
  return (
    <Row title={`${o.number}. ${o.name}`} active={o.active} meta={<span className="num">{o.upfrontIncluded ? "Included" : o.upfrontMin != null ? formatBand(o.upfrontMin, o.upfrontMax ?? o.upfrontMin) : "—"} · {o.monthlyMin != null ? formatBand(o.monthlyMin, o.monthlyMax ?? o.monthlyMin) : "—"}/mo</span>}>
      {src && <p className="mb-3 text-[12px] text-ink-3">Board: {src.name} · upfront {bandText(src.upfront)} · monthly {bandText(src.monthly)}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor={`on-${o.id}`}><Input id={`on-${o.id}`} value={v.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Cluster" htmlFor={`oc-${o.id}`}><Select id={`oc-${o.id}`} value={v.clusterId ?? ""} onChange={(e) => set({ clusterId: e.target.value || null })}><option value="">Any industry</option>{clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Buyer quote" htmlFor={`oq-${o.id}`} className="sm:col-span-2"><Input id={`oq-${o.id}`} value={v.buyerQuote} onChange={(e) => set({ buyerQuote: e.target.value })} /></Field>
        <Field label="Description (client-facing)" htmlFor={`od-${o.id}`} className="sm:col-span-2"><Textarea id={`od-${o.id}`} rows={2} value={v.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <Field label="Upfront type" htmlFor={`ou-${o.id}`}><Select id={`ou-${o.id}`} value={v.upfrontKind} onChange={(e) => set({ upfrontKind: e.target.value as "setup" | "project" })}><option value="setup">Setup fee</option><option value="project">Project fee</option></Select></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={v.upfrontIncluded} onChange={(e) => set({ upfrontIncluded: e.target.checked })} /> Setup included (no upfront fee)</label>
        {!v.upfrontIncluded && <>
          <Field label="Upfront min" htmlFor={`umin-${o.id}`}><MoneyInput id={`umin-${o.id}`} value={v.upfrontMin ?? 0} onChange={(n) => set({ upfrontMin: n })} /></Field>
          <Field label="Upfront max" htmlFor={`umax-${o.id}`}><MoneyInput id={`umax-${o.id}`} value={v.upfrontMax ?? 0} onChange={(n) => set({ upfrontMax: n })} /></Field>
        </>}
        <Field label="Monthly min" htmlFor={`mmin-${o.id}`}><MoneyInput id={`mmin-${o.id}`} value={v.monthlyMin ?? 0} onChange={(n) => set({ monthlyMin: n })} /></Field>
        <Field label="Monthly max" htmlFor={`mmax-${o.id}`}><MoneyInput id={`mmax-${o.id}`} value={v.monthlyMax ?? 0} onChange={(n) => set({ monthlyMax: n })} /></Field>
        <Field label="Fixed monthly term (months)" htmlFor={`mt-${o.id}`} hint="Blank = ongoing"><Input id={`mt-${o.id}`} inputMode="numeric" value={v.monthlyTermMonths ?? ""} onChange={(e) => set({ monthlyTermMonths: Number(e.target.value.replace(/\D/g, "")) || null })} /></Field>
        <Field label="Suggested industries (ranking only)" htmlFor={`os-${o.id}`}><MultiSelect label="Suggested industries" value={v.suggestedIndustryIds} onChange={(x) => set({ suggestedIndustryIds: x })} options={industries.map((i) => ({ value: i.id, label: i.name }))} /></Field>
        <Field label="Delivery cost one-time (internal)" htmlFor={`odc1-${o.id}`}><MoneyInput id={`odc1-${o.id}`} value={v.deliveryCostOneTime} onChange={(n) => set({ deliveryCostOneTime: n })} /></Field>
        <Field label="Delivery cost monthly (internal)" htmlFor={`odc2-${o.id}`}><MoneyInput id={`odc2-${o.id}`} value={v.deliveryCostMonthly} onChange={(n) => set({ deliveryCostMonthly: n })} /></Field>
      </div>
      <p className="mb-2 mt-4 text-[14px] font-semibold">Included components</p>
      <div className="flex flex-col gap-2">
        {v.components.map((c, i) => (
          <div key={i} className="grid gap-2 rounded-[10px] bg-surface-2 p-3 sm:grid-cols-[1fr_1.4fr_auto]">
            <Input aria-label="Component label" value={c.label} onChange={(e) => set({ components: v.components.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <MultiSelect label="Mapped services" size={3} value={c.serviceIds} onChange={(ids) => set({ components: v.components.map((x, j) => (j === i ? { ...x, serviceIds: ids, basis: ids.length ? "admin" : "unmapped" } : x)) })} options={services.map((s) => ({ value: s.id, label: s.name }))} />
            <div className="flex flex-col items-start gap-1">
              <Badge tone={c.basis === "unmapped" ? "warn" : c.basis === "inferred" ? "info" : "neutral"}>{c.basis === "inferred" ? "Mapping inferred — review" : c.basis === "unmapped" ? "Not mapped" : c.basis}</Badge>
              <Button size="sm" variant="ghost" onClick={() => set({ components: v.components.filter((_, j) => j !== i) })}>Remove</Button>
            </div>
          </div>
        ))}
        <Button size="sm" variant="secondary" className="self-start" onClick={() => set({ components: [...v.components, { label: "New component", serviceIds: [], basis: "unmapped" }] })}>+ Add component</Button>
      </div>
      <Actions active={v.active} onToggle={() => set({ active: !v.active })} order={v.sortOrder} onOrder={(n) => set({ sortOrder: n })} busy={busy}
        onSave={() => save({ id: v.id, number: v.number, name: v.name, clusterId: v.clusterId, audienceLabel: v.clusterId ? clusters.find((c) => c.id === v.clusterId)?.name ?? v.audienceLabel : v.audienceLabel, buyerQuote: v.buyerQuote, components: v.components, upfrontKind: v.upfrontKind, upfrontMin: v.upfrontIncluded ? null : v.upfrontMin, upfrontMax: v.upfrontIncluded ? null : v.upfrontMax, upfrontIncluded: v.upfrontIncluded, monthlyMin: v.monthlyMin, monthlyMax: v.monthlyMax, monthlyTermMonths: v.monthlyTermMonths, suggestedIndustryIds: v.suggestedIndustryIds, description: v.description, deliveryCostOneTime: v.deliveryCostOneTime, deliveryCostMonthly: v.deliveryCostMonthly, active: v.active, sortOrder: v.sortOrder })}
        onReset={o.origin === "opportunity_board" ? () => reset(o.id) : undefined} />
    </Row>
  );
}

function IndustryEditor({ i, clusters }: { i: Ind; clusters: Props["clusters"] }) {
  const [v, setV] = useState({ ...i, kw: i.keywords.join(", ") });
  const { save, reset, busy } = useAdminSave("industries");
  return (
    <Row title={i.name} active={i.active} meta={i.origin === "opportunity_board" ? <Badge tone="accent">Board</Badge> : null}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor={`in-${i.id}`}><Input id={`in-${i.id}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Cluster" htmlFor={`ic-${i.id}`}><Select id={`ic-${i.id}`} value={v.clusterId} onChange={(e) => setV({ ...v, clusterId: e.target.value })}>{clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Website keywords (comma-separated, for industry suggestions)" htmlFor={`ik-${i.id}`} className="sm:col-span-2"><Input id={`ik-${i.id}`} value={v.kw} onChange={(e) => setV({ ...v, kw: e.target.value })} /></Field>
      </div>
      <Actions active={v.active} onToggle={() => setV({ ...v, active: !v.active })} order={v.sortOrder} onOrder={(n) => setV({ ...v, sortOrder: n })} busy={busy}
        onSave={() => save({ id: v.id, name: v.name, clusterId: v.clusterId, keywords: v.kw.split(",").map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 2), active: v.active, sortOrder: v.sortOrder })}
        onReset={i.origin === "opportunity_board" ? () => reset(i.id) : undefined} />
    </Row>
  );
}

function Actions({ active, onToggle, order, onOrder, onSave, onReset, busy }: { active: boolean; onToggle: () => void; order: number; onOrder: (n: number) => void; onSave: () => void; onReset?: () => void; busy: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <Button onClick={onSave} loading={busy}>Save</Button>
      <Button variant="secondary" onClick={onToggle}>{active ? "Deactivate" : "Activate"}</Button>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">Order <input aria-label="Sort order" className="field num w-20" inputMode="numeric" value={order} onChange={(e) => onOrder(Number(e.target.value.replace(/\D/g, "")) || 0)} /></label>
      {onReset && <Button variant="ghost" onClick={onReset}>Restore board values</Button>}
      <span className="text-[12px] text-ink-3">{active ? "" : "Inactive — hidden from new quotations"}</span>
    </div>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function NewService({ links, order }: { links: Props["links"]; order: number }) {
  const [name, setName] = useState("");
  const [linkId, setLinkId] = useState(links[0]?.id ?? "");
  const { save, busy } = useAdminSave("services");
  return (
    <Card className="mt-2 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <Field label="New service" htmlFor="ns-n" className="flex-1"><Input id="ns-n" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Link" htmlFor="ns-l"><Select id="ns-l" value={linkId} onChange={(e) => setLinkId(e.target.value)}>{links.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
      <Button disabled={!name.trim()} loading={busy} onClick={async () => { if (await save({ id: slug(name), name: name.trim(), linkId, description: "", industryIds: [], defaultModel: "custom", priceOptions: [], deliveryCostOneTime: 0, deliveryCostMonthly: 0, active: true, sortOrder: order }, "Service added")) setName(""); }}>Add service</Button>
    </Card>
  );
}

function NewOffer({ next, order }: { next: number; order: number }) {
  const [name, setName] = useState("");
  const { save, busy } = useAdminSave("offers");
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <Field label="New packaged offer" htmlFor="no-n" className="flex-1"><Input id="no-n" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Button disabled={!name.trim()} loading={busy} onClick={async () => { if (await save({ id: slug(name), number: next, name: name.trim(), clusterId: null, audienceLabel: "Any industry", buyerQuote: "", components: [], upfrontKind: "setup", upfrontMin: null, upfrontMax: null, upfrontIncluded: false, monthlyMin: null, monthlyMax: null, monthlyTermMonths: null, suggestedIndustryIds: [], description: "", deliveryCostOneTime: 0, deliveryCostMonthly: 0, active: false, sortOrder: order }, "Offer added (inactive until configured)")) setName(""); }}>Add offer</Button>
    </Card>
  );
}

function NewIndustry({ clusters, order }: { clusters: Props["clusters"]; order: number }) {
  const [name, setName] = useState("");
  const [clusterId, setClusterId] = useState(clusters[0]?.id ?? "");
  const { save, busy } = useAdminSave("industries");
  return (
    <Card className="mt-2 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <Field label="New industry" htmlFor="ni-n" className="flex-1"><Input id="ni-n" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Cluster" htmlFor="ni-c"><Select id="ni-c" value={clusterId} onChange={(e) => setClusterId(e.target.value)}>{clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Button disabled={!name.trim()} loading={busy} onClick={async () => { if (await save({ id: slug(name), name: name.trim(), clusterId, keywords: [], active: true, sortOrder: order }, "Industry added")) setName(""); }}>Add industry</Button>
    </Card>
  );
}
