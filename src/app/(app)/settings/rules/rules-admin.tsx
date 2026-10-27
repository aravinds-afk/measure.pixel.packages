"use client";

import { useState } from "react";
import { useAdminSave } from "@/components/admin";
import { Badge, Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import type { RuleTrigger } from "@/data/defaults";
import type { CatalogRows } from "@/server/catalog";

type Opt = { id: string; name?: string; label?: string };
const STATUSES = [["missing", "Missing"], ["needs_improvement", "Needs improvement"], ["working_well", "Working well"], ["not_applicable", "Not applicable"]] as const;

export function RulesAdmin({ rules, deps, offers, items, services, goals }: { rules: CatalogRows["rules"]; deps: CatalogRows["deps"]; offers: Opt[]; items: Opt[]; services: Opt[]; goals: Opt[] }) {
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="info" title="How recommendations are scored">
        Each offer scores the weights of its matched triggers, +1 per client-confirmed finding, +4 if the client recognised the buyer quote and +2 for a suggested industry. An offer appears only when at least one audit gap matched or the quote was recognised, and only within its industry cluster. The top three that reach the minimum score are recommended.
      </Notice>
      <section>
        <p className="eyebrow mb-2">Offer rules</p>
        <div className="flex flex-col gap-2">{rules.map((r) => <RuleEditor key={r.id} rule={r} offers={offers} items={items} goals={goals} />)}</div>
      </section>
      <section>
        <p className="eyebrow mb-2">Service dependencies</p>
        <Card className="divide-y divide-border">{deps.map((d) => <DepEditor key={d.id} dep={d} services={services} />)}</Card>
        <DepEditor services={services} />
      </section>
    </div>
  );
}

function RuleEditor({ rule, offers, items, goals }: { rule: CatalogRows["rules"][number]; offers: Opt[]; items: Opt[]; goals: Opt[] }) {
  const [v, setV] = useState({ ...rule, triggers: rule.triggers as RuleTrigger[] });
  const { save, busy } = useAdminSave("rules");
  const setT = (i: number, t: RuleTrigger) => setV({ ...v, triggers: v.triggers.map((x, j) => (j === i ? t : x)) });
  return (
    <details className="card">
      <summary className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
        <span className={rule.active ? "font-medium" : "font-medium text-ink-3 line-through"}>{offers.find((o) => o.id === rule.offerId)?.name ?? rule.offerId}</span>
        <Badge>{(rule.triggers as unknown[]).length} triggers · min {rule.minScore}</Badge>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-4">
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <Field label="Minimum score" htmlFor={`ms-${rule.id}`}><Input id={`ms-${rule.id}`} inputMode="numeric" value={v.minScore} onChange={(e) => setV({ ...v, minScore: Number(e.target.value.replace(/\D/g, "")) || 1 })} /></Field>
          <Field label="Expected outcome (shown in recommendations)" htmlFor={`oc-${rule.id}`}><Input id={`oc-${rule.id}`} value={v.outcome} onChange={(e) => setV({ ...v, outcome: e.target.value })} /></Field>
        </div>
        {v.triggers.map((t, i) => (
          <div key={i} className="grid gap-2 rounded-[10px] bg-surface-2 p-3 sm:grid-cols-[110px_1fr_auto_80px_auto] sm:items-center">
            <Select aria-label="Trigger type" value={t.kind} onChange={(e) => setT(i, e.target.value === "goal" ? { kind: "goal", goalId: goals[0].id, weight: t.weight } : { kind: "audit", itemId: items[0].id, statuses: ["missing", "needs_improvement"], weight: t.weight })}>
              <option value="audit">Audit</option><option value="goal">Goal</option>
            </Select>
            {t.kind === "audit" ? (
              <Select aria-label="Audit item" value={t.itemId} onChange={(e) => setT(i, { ...t, itemId: e.target.value })}>{items.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select>
            ) : (
              <Select aria-label="Goal" value={t.goalId} onChange={(e) => setT(i, { ...t, goalId: e.target.value })}>{goals.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select>
            )}
            {t.kind === "audit" ? (
              <div className="flex flex-wrap gap-2 text-[12px]">
                {STATUSES.map(([k, l]) => (
                  <label key={k} className="flex items-center gap-1"><input type="checkbox" className="accent-[#121212]" checked={t.statuses.includes(k)} onChange={(e) => setT(i, { ...t, statuses: e.target.checked ? [...t.statuses, k] : t.statuses.filter((s) => s !== k) })} />{l}</label>
                ))}
              </div>
            ) : <span />}
            <Input aria-label="Weight" inputMode="numeric" value={t.weight} onChange={(e) => setT(i, { ...t, weight: Math.min(10, Number(e.target.value.replace(/\D/g, "")) || 1) })} />
            <Button size="sm" variant="ghost" onClick={() => setV({ ...v, triggers: v.triggers.filter((_, j) => j !== i) })}>Remove</Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setV({ ...v, triggers: [...v.triggers, { kind: "audit", itemId: items[0].id, statuses: ["missing", "needs_improvement"], weight: 2 }] })}>+ Trigger</Button>
          <Button loading={busy} onClick={() => save({ id: v.id, offerId: v.offerId, minScore: v.minScore, outcome: v.outcome, active: v.active, triggers: v.triggers })}>Save rule</Button>
          <Button variant="secondary" onClick={() => save({ id: v.id, offerId: v.offerId, minScore: v.minScore, outcome: v.outcome, active: !v.active, triggers: v.triggers }, v.active ? "Rule disabled" : "Rule enabled")}>{v.active ? "Disable" : "Enable"}</Button>
        </div>
      </div>
    </details>
  );
}

function DepEditor({ dep, services }: { dep?: CatalogRows["deps"][number]; services: Opt[] }) {
  const [v, setV] = useState(dep ?? { id: "", serviceId: services[0]?.id ?? "", requiresServiceId: services[1]?.id ?? "", reason: "", active: true });
  const { save, busy } = useAdminSave("dependencies");
  return (
    <div className={dep ? "grid gap-2 p-4 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end" : "card mt-2 grid gap-2 p-4 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end"}>
      <Field label={dep ? "Service" : "New: service"} htmlFor={`ds-${v.id}`}><Select id={`ds-${v.id}`} value={v.serviceId} onChange={(e) => setV({ ...v, serviceId: e.target.value })}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Requires" htmlFor={`dr-${v.id}`}><Select id={`dr-${v.id}`} value={v.requiresServiceId} onChange={(e) => setV({ ...v, requiresServiceId: e.target.value })}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Reason" htmlFor={`dw-${v.id}`}><Input id={`dw-${v.id}`} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} /></Field>
      <div className="flex gap-2">
        <Button size="sm" loading={busy} disabled={!v.reason.trim()} onClick={() => save({ ...v, id: v.id || `dep-${v.serviceId}-${v.requiresServiceId}` }, dep ? "Saved" : "Dependency added")}>Save</Button>
        {dep && <Button size="sm" variant="secondary" onClick={() => save({ ...v, active: !v.active }, v.active ? "Disabled" : "Enabled")}>{v.active ? "Disable" : "Enable"}</Button>}
      </div>
    </div>
  );
}
