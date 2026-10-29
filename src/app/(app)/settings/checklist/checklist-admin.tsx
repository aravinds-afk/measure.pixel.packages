"use client";

import { useState } from "react";
import { MultiSelect, useAdminSave } from "@/components/admin";
import { Badge, Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import type { CatalogRows } from "@/server/catalog";

type Item = CatalogRows["auditItems"][number];

export function ChecklistAdmin({ items, categories, services }: { items: Item[]; categories: CatalogRows["categories"]; services: { id: string; name: string }[] }) {
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="info">Audit categories are not a service catalogue: each item maps to the board services that fix it. The recommendation rules refer to items by ID, so deactivate items instead of renaming their meaning.</Notice>
      {categories.map((c) => (
        <section key={c.id}>
          <p className="eyebrow mb-2">{c.name}</p>
          <div className="flex flex-col gap-2">
            {items.filter((i) => i.categoryId === c.id).map((i) => <ItemEditor key={i.id} item={i} categories={categories} services={services} />)}
          </div>
          <NewItem categoryId={c.id} order={items.length} />
        </section>
      ))}
    </div>
  );
}

function ItemEditor({ item, categories, services }: { item: Item; categories: CatalogRows["categories"]; services: { id: string; name: string }[] }) {
  const [v, setV] = useState(item);
  const { save, busy } = useAdminSave("auditItems");
  return (
    <details className="card">
      <summary className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
        <span className={item.active ? "font-medium" : "font-medium text-ink-3 line-through"}>{item.label}</span>
        <span className="flex gap-1.5">{item.priority === "high" && <Badge tone="danger">High</Badge>}{item.autoCheck && <Badge tone="ok">Website check</Badge>}</span>
      </summary>
      <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
        <Field label="Label" htmlFor={`l-${item.id}`} className="sm:col-span-2"><Input id={`l-${item.id}`} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} /></Field>
        <Field label="Help text" htmlFor={`h-${item.id}`} className="sm:col-span-2"><Input id={`h-${item.id}`} value={v.help} onChange={(e) => setV({ ...v, help: e.target.value })} /></Field>
        <Field label="Category" htmlFor={`c-${item.id}`}><Select id={`c-${item.id}`} value={v.categoryId} onChange={(e) => setV({ ...v, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Priority" htmlFor={`p-${item.id}`}><Select id={`p-${item.id}`} value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value as Item["priority"] })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
        <Field label="Solved by services" htmlFor={`s-${item.id}`} className="sm:col-span-2"><MultiSelect label="Services" value={v.serviceIds} onChange={(x) => setV({ ...v, serviceIds: x })} options={services.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <p className="text-[12px] text-ink-3 sm:col-span-2">ID {item.id}{item.autoCheck ? ` · prefilled from website signal “${item.autoCheck}”` : ""}</p>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button loading={busy} onClick={() => save({ id: v.id, categoryId: v.categoryId, label: v.label, help: v.help, priority: v.priority, serviceIds: v.serviceIds, active: v.active, sortOrder: v.sortOrder })}>Save</Button>
          <Button variant="secondary" onClick={() => save({ id: v.id, categoryId: v.categoryId, label: v.label, help: v.help, priority: v.priority, serviceIds: v.serviceIds, active: !v.active, sortOrder: v.sortOrder }, v.active ? "Deactivated" : "Activated")}>{v.active ? "Deactivate" : "Activate"}</Button>
          <label className="flex items-center gap-2 text-[13px] text-ink-2">Order <input aria-label="Sort order" className="field num w-20" inputMode="numeric" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
        </div>
      </div>
    </details>
  );
}

function NewItem({ categoryId, order }: { categoryId: string; order: number }) {
  const [label, setLabel] = useState("");
  const { save, busy } = useAdminSave("auditItems");
  return (
    <Card className="mt-2 flex flex-col gap-2 p-3 sm:flex-row sm:items-end">
      <Field label="New checklist item" htmlFor={`new-${categoryId}`} className="flex-1"><Input id={`new-${categoryId}`} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
      <Button disabled={!label.trim()} loading={busy} onClick={async () => {
        const id = `x-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30)}`;
        if (await save({ id, categoryId, label: label.trim(), help: "", priority: "medium", serviceIds: [], active: true, sortOrder: order }, "Item added")) setLabel("");
      }}>Add</Button>
    </Card>
  );
}
