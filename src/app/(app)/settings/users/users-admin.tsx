"use client";

import { useState } from "react";
import { useAdminSave } from "@/components/admin";
import { Badge, Button, Card, Field, Input, Notice, Select } from "@/components/ui";

type U = { id?: string; email: string; name: string; role: "admin" | "consultant"; canOverridePrices: boolean; active: boolean };

export function UsersAdmin({ users, meId }: { users: U[]; meId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info">Consultants run audits and quotations, price offers inside board bands and discount up to the configured limit. “Price override” allows prices outside bands and edits to configured prices. Only admins see delivery costs and margins.</Notice>
      <Card className="divide-y divide-border">{users.map((u) => <UserRow key={u.id} u={u} isMe={u.id === meId} />)}</Card>
      <p className="eyebrow mt-2">Add user</p>
      <Card><UserRow u={{ email: "", name: "", role: "consultant", canOverridePrices: false, active: true }} isMe={false} isNew /></Card>
    </div>
  );
}

function UserRow({ u, isMe, isNew }: { u: U; isMe: boolean; isNew?: boolean }) {
  const [v, setV] = useState(u);
  const [password, setPassword] = useState("");
  const { save, busy } = useAdminSave("users");
  return (
    <form className="grid gap-3 p-4 sm:grid-cols-6 sm:items-end" onSubmit={async (e) => {
      e.preventDefault();
      const ok = await save({ ...v, ...(password ? { password } : {}) }, isNew ? "User created" : "User updated");
      if (ok) { setPassword(""); if (isNew) setV(u); }
    }}>
      <Field label="Name" htmlFor={`un-${u.id ?? "new"}`}><Input id={`un-${u.id ?? "new"}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
      <Field label="Email" htmlFor={`ue-${u.id ?? "new"}`} className="sm:col-span-2"><Input id={`ue-${u.id ?? "new"}`} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} required /></Field>
      <Field label="Role" htmlFor={`ur-${u.id ?? "new"}`}><Select id={`ur-${u.id ?? "new"}`} value={v.role} disabled={isMe} onChange={(e) => setV({ ...v, role: e.target.value as U["role"] })}><option value="consultant">Consultant</option><option value="admin">Admin</option></Select></Field>
      <Field label={isNew ? "Password (10+ chars)" : "New password"} htmlFor={`up-${u.id ?? "new"}`}><Input id={`up-${u.id ?? "new"}`} type="password" autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required={isNew} /></Field>
      <Button type="submit" loading={busy}>{isNew ? "Create" : "Save"}</Button>
      <div className="flex flex-wrap items-center gap-4 text-[14px] sm:col-span-6">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={v.canOverridePrices || v.role === "admin"} disabled={v.role === "admin"} onChange={(e) => setV({ ...v, canOverridePrices: e.target.checked })} />Price override</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={v.active} disabled={isMe} onChange={(e) => setV({ ...v, active: e.target.checked })} />Active</label>
        {isMe && <Badge tone="info">You</Badge>}
      </div>
    </form>
  );
}
