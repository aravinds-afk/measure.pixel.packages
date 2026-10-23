import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, Plus, RotateCcw, Save, Trash2, UserX } from "lucide-react";
import { CATEGORIES, DEFAULT_SETTINGS, FACTOR_LABELS, type ChapterSettings, type FactorKey } from "@engine/index.ts";
import { useApp, useAsync } from "../lib/app.tsx";
import type { Role } from "../lib/backend/index.ts";
import {
  Badge, Button, Card, CardHeader, categoryName, EmptyState, ErrorNote, Field, fmtDate, Input, ListInput, MemberChip, Modal, Notice, PageHeader, Select, Spinner, Tabs, Textarea,
} from "../components/ui.tsx";

type Tab = "members" | "invitations" | "scoring" | "review" | "audit";

export default function AdminMembers() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) ?? "members";
  return (
    <div>
      <PageHeader title="Member management" subtitle="Manage member data, access and permissions, scoring configuration and recommendation quality." />
      <div className="mb-5">
        <Tabs value={tab} onChange={(v) => setParams({ tab: v })} tabs={[
          { value: "members", label: "Members & access" },
          { value: "invitations", label: "Invitations" },
          { value: "scoring", label: "Scoring weights" },
          { value: "review", label: "Recommendation review" },
          { value: "audit", label: "Audit log" },
        ]} />
      </div>
      {tab === "members" && <MembersTab />}
      {tab === "invitations" && <InvitationsTab />}
      {tab === "scoring" && <ScoringTab />}
      {tab === "review" && <ReviewTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

function MembersTab() {
  const { backend, members, refreshMembers, toast, session } = useApp();
  const access = useAsync(() => backend.memberAccess(), [members.length]);
  const accessOf = useMemo(() => new Map((access.data ?? []).map((a) => [a.memberId, a])), [access.data]);
  const [q, setQ] = useState("");
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deact, setDeact] = useState<string | null>(null);
  const [erase, setErase] = useState<string | null>(null);
  const list = members.filter((m) => !q || `${m.fullName} ${m.company ?? ""} ${categoryName(m)}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const act = async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn();
      await refreshMembers();
      access.reload();
      toast(msg);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <Card>
      <CardHeader title={`${members.length} member records`} subtitle="Inactive members are hidden from the directory and lose access, but keep their history." action={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" /> Add member</Button>} />
      <div className="px-5 pt-4"><Input aria-label="Filter members" placeholder="Filter members" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Member</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Source</th><th className="px-3 py-2 font-medium">Access</th><th className="px-3 py-2 font-medium">Updated</th><th className="px-5 py-2 text-right font-medium">Actions</th></tr></thead>
          <tbody>
            {list.map((m) => {
              const a = accessOf.get(m.id);
              const self = a?.userId === session?.userId;
              return (
                <tr key={m.id} className="border-b border-slate-50 align-middle">
                  <td className="px-5 py-2.5"><Link to={`/members/${m.id}`}><MemberChip member={m} /></Link></td>
                  <td className="px-3 py-2.5">{m.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}{!m.categoryId && <Badge tone="amber" className="ml-1">Unmapped category</Badge>}</td>
                  <td className="px-3 py-2.5 text-xs capitalize text-slate-500">{m.source?.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2.5">
                    {a?.userId ? (
                      <Select aria-label="Role" className="w-36 py-1 text-xs" value={a.role ?? ""} disabled={self || m.status !== "active"} onChange={(e) => act(() => backend.setRole(a.userId!, e.target.value as Role), "Role updated")}>
                        <option value="member">Member</option><option value="leadership">Leadership</option><option value="admin">Admin</option>
                      </Select>
                    ) : <Button size="sm" variant="ghost" disabled={m.status !== "active"} onClick={() => setInviteFor(m.id)}><Mail className="h-3.5 w-3.5" /> Invite</Button>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{fmtDate(m.profileUpdatedAt)}</td>
                  <td className="px-5 py-2.5 text-right">
                    {m.status === "active" ? (
                      <Button size="sm" variant="ghost" disabled={self} onClick={() => setDeact(m.id)}><UserX className="h-3.5 w-3.5" /> Deactivate</Button>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => act(() => backend.reactivate(m.id), "Member reactivated")}><RotateCcw className="h-3.5 w-3.5" /> Reactivate</Button>
                        <Button size="sm" variant="ghost" onClick={() => setErase(m.id)}><Trash2 className="h-3.5 w-3.5 text-red-600" /></Button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <InviteModal memberId={inviteFor} onClose={() => setInviteFor(null)} />
      <AddMemberModal open={adding} onClose={() => setAdding(false)} />
      <DeactivateModal memberId={deact} onClose={() => setDeact(null)} onConfirm={(reason) => act(() => backend.deactivate(deact!, reason), "Member deactivated")} />
      <Modal open={!!erase} onClose={() => setErase(null)} title="Permanently erase member data?">
        <p className="text-sm text-slate-700">This deletes the member record, profile, contact details, assessments, saved connections, meetings and referral records involving them. This cannot be undone and is logged.</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setErase(null)}>Cancel</Button><Button variant="danger" onClick={async () => { await act(() => backend.erase(erase!), "Member erased"); setErase(null); }}>Erase permanently</Button></div>
      </Modal>
    </Card>
  );
}

function DeactivateModal({ memberId, onClose, onConfirm }: { memberId: string | null; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const { memberById } = useApp();
  const [reason, setReason] = useState("Left the chapter");
  return (
    <Modal open={!!memberId} onClose={onClose} title={`Deactivate ${memberById(memberId)?.fullName ?? "member"}`}>
      <p className="mb-3 text-sm text-slate-600">They will be hidden from the directory and scoring, and their sign-in access to this chapter is removed. You can reactivate later.</p>
      <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={async () => { await onConfirm(reason); onClose(); }}>Deactivate</Button></div>
    </Modal>
  );
}

function InviteModal({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const { backend, memberById, toast } = useApp();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!memberId) return;
    backend.getContact(memberId).then((c) => setEmail(c?.email ?? "")).catch(() => setEmail(""));
  }, [memberId, backend]);
  return (
    <Modal open={!!memberId} onClose={onClose} title={`Invite ${memberById(memberId)?.fullName ?? ""}`}>
      <div className="space-y-3">
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value as Role)}><option value="member">Chapter member</option><option value="leadership">Leadership team</option><option value="admin">Chapter admin</option></Select></Field>
        <div className="flex justify-end gap-2 pt-1"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={async () => {
          setBusy(true);
          try { const r = await backend.invite(email, role, memberId); toast(r.note ?? "Invitation sent", r.note ? "info" : "success"); onClose(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
        }}>Send invitation</Button></div>
      </div>
    </Modal>
  );
}

function AddMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { backend, refreshMembers, toast } = useApp();
  const [f, setF] = useState({ fullName: "", externalId: "", company: "", categoryId: "", email: "", phone: "", services: [] as string[], customerSegments: [] as string[], serviceAreas: [] as string[] });
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title="Add member manually" wide>
      <Notice>Only add members with their permission. Members can complete the rest of their profile after accepting an invitation.</Notice>
      {err && <div className="mt-3"><ErrorNote message={err} /></div>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Full name *"><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Member ID (from official records)"><Input value={f.externalId} onChange={(e) => setF({ ...f, externalId: e.target.value })} /></Field>
        <Field label="Company"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
        <Field label="Professional category"><Select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}><option value="">Custom / not listed</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Services"><ListInput value={f.services} onChange={(v) => setF({ ...f, services: v })} /></Field>
        <Field label="Customer types"><ListInput value={f.customerSegments} onChange={(v) => setF({ ...f, customerSegments: v })} /></Field>
        <Field label="Service area"><ListInput value={f.serviceAreas} onChange={(v) => setF({ ...f, serviceAreas: v })} /></Field>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={async () => {
        setErr(null);
        if (!f.fullName.trim()) return setErr("Full name is required.");
        if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return setErr("Email is not valid.");
        try {
          const cat = CATEGORIES.find((c) => c.id === f.categoryId);
          await backend.createMember({ fullName: f.fullName, externalId: f.externalId || null, company: f.company || null, categoryId: f.categoryId || null, categoryLabel: cat?.name ?? null, services: f.services, customerSegments: f.customerSegments, serviceAreas: f.serviceAreas }, { email: f.email || null, phone: f.phone || null, visibility: "chapter" });
          await refreshMembers();
          toast("Member added");
          onClose();
        } catch (e) { setErr((e as Error).message); }
      }}>Add member</Button></div>
    </Modal>
  );
}

function InvitationsTab() {
  const { backend, memberById, toast } = useApp();
  const q = useAsync(() => backend.listInvitations(), []);
  if (q.loading) return <Spinner />;
  if (q.error) return <ErrorNote message={q.error} />;
  return (
    <Card>
      <CardHeader title="Invitations" subtitle="Invite members from the Members tab. Accepted invitations link the account to the member record." />
      {q.data?.length ? (
        <ul className="divide-y divide-slate-100">
          {q.data.map((i) => (
            <li key={i.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="text-sm font-medium text-navy-950">{i.email}</div><div className="text-xs text-slate-500">{memberById(i.memberId)?.fullName ?? "No member linked"} · <span className="capitalize">{i.role}</span> · {fmtDate(i.createdAt)}</div></div>
              <div className="flex items-center gap-2"><Badge tone={i.status === "accepted" ? "green" : i.status === "revoked" ? "red" : "blue"} className="capitalize">{i.status}</Badge>{i.status === "pending" && <Button size="sm" variant="ghost" onClick={async () => { await backend.revokeInvitation(i.id); q.reload(); toast("Invitation revoked"); }}>Revoke</Button>}</div>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No invitations yet" />}
    </Card>
  );
}

function ScoringTab() {
  const { backend, toast } = useApp();
  const q = useAsync(() => backend.getSettings(), []);
  const [s, setS] = useState<ChapterSettings | null>(null);
  useEffect(() => {
    if (q.data) setS(q.data);
  }, [q.data]);
  if (q.loading || !s) return <Spinner />;
  const total = Object.values(s.weights).reduce((a, b) => a + (Number(b) || 0), 0);
  const keys = Object.keys(FACTOR_LABELS) as FactorKey[];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Factor weights" subtitle="Each factor is scored 0–100; the total is the weighted sum. Weights must add up to 100%." />
        <div className="space-y-3 p-5">
          {keys.map((k) => (
            <div key={k} className="grid grid-cols-[1fr_120px_48px] items-center gap-3">
              <label htmlFor={`w-${k}`} className="text-sm text-slate-700">{FACTOR_LABELS[k]}</label>
              <input id={`w-${k}`} type="range" min={0} max={50} value={s.weights[k]} onChange={(e) => setS({ ...s, weights: { ...s.weights, [k]: Number(e.target.value) } })} />
              <Input aria-label={`${FACTOR_LABELS[k]} weight`} type="number" min={0} max={100} value={s.weights[k]} onChange={(e) => setS({ ...s, weights: { ...s.weights, [k]: Number(e.target.value) } })} className="px-2 py-1 text-right" />
            </div>
          ))}
          <div className={`flex justify-between border-t border-slate-100 pt-3 text-sm font-semibold ${total === 100 ? "text-emerald-700" : "text-red-700"}`}><span>Total</span><span>{total}%</span></div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Score classifications" subtitle="Labels describe potential, never guaranteed results." />
        <div className="space-y-2 p-5">
          {s.bands.map((b, i) => (
            <div key={i} className="grid grid-cols-[72px_1fr] gap-2">
              <Input aria-label="Minimum score" type="number" min={0} max={100} value={b.min} onChange={(e) => { const bands = [...s.bands]; bands[i] = { ...b, min: Number(e.target.value) }; setS({ ...s, bands }); }} />
              <Input aria-label="Label" value={b.label} onChange={(e) => { const bands = [...s.bands]; bands[i] = { ...b, label: e.target.value }; setS({ ...s, bands }); }} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="secondary" onClick={() => setS(structuredClone(DEFAULT_SETTINGS))}>Reset to defaults</Button>
          <Button disabled={total !== 100} onClick={async () => { try { await backend.saveSettings(s); toast("Scoring configuration saved. New reports use these weights."); } catch (e) { toast((e as Error).message, "error"); } }}><Save className="h-4 w-4" /> Save</Button>
        </div>
      </Card>
    </div>
  );
}

function ReviewTab() {
  const { backend, memberById, toast } = useApp();
  const fb = useAsync(() => backend.allFeedback(), []);
  const sup = useAsync(() => backend.suppressedKeys(), []);
  const [resolving, setResolving] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [suppress, setSuppress] = useState(true);
  if (fb.loading) return <Spinner />;
  if (fb.error) return <ErrorNote message={fb.error} />;
  const inaccurate = (fb.data ?? []).filter((f) => f.verdict === "inaccurate");
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Recommendations flagged as inaccurate" subtitle={`${(fb.data ?? []).filter((f) => f.verdict === "useful").length} marked useful · ${inaccurate.length} flagged`} />
        {inaccurate.length ? (
          <ul className="divide-y divide-slate-100">
            {inaccurate.map((f) => (
              <li key={f.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm"><b>{memberById(f.giverId)?.fullName}</b> → <b>{memberById(f.receiverId)?.fullName}</b> <span className="text-xs text-slate-500">· {f.key.split(":").pop()?.replace(/_/g, " ")}</span></div>
                  {f.resolution ? <Badge tone="green">Resolved</Badge> : <Button size="sm" variant="secondary" onClick={() => { setResolving(f.id); setText(""); }}>Review</Button>}
                </div>
                {f.note && <p className="mt-1 text-xs text-slate-600">“{f.note}”</p>}
                {f.resolution && <p className="mt-1 text-xs text-emerald-700">Resolution: {f.resolution}</p>}
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Nothing flagged">Members can flag recommendations as inaccurate from any compatibility report.</EmptyState>}
      </Card>
      <Card>
        <CardHeader title="Withdrawn recommendations" subtitle="Hidden from every member's reports." />
        <ul className="divide-y divide-slate-100">
          {(sup.data ?? []).map((k) => (
            <li key={k} className="flex items-center justify-between px-5 py-2.5 text-xs"><code className="truncate text-slate-600">{k}</code><Button size="sm" variant="ghost" onClick={async () => { await backend.unsuppress(k); sup.reload(); toast("Recommendation restored"); }}>Restore</Button></li>
          ))}
          {!sup.data?.length && <li className="px-5 py-4 text-sm text-slate-500">None.</li>}
        </ul>
      </Card>
      <Modal open={!!resolving} onClose={() => setResolving(null)} title="Review recommendation">
        <Field label="Resolution / correction note"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Member no longer offers this service; profile corrected." /></Field>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={suppress} onChange={(e) => setSuppress(e.target.checked)} /> Withdraw this recommendation for the whole chapter</label>
        <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setResolving(null)}>Cancel</Button><Button disabled={!text.trim()} onClick={async () => { try { await backend.resolveFeedback(resolving!, text, suppress); setResolving(null); fb.reload(); sup.reload(); toast("Feedback resolved"); } catch (e) { toast((e as Error).message, "error"); } }}>Save resolution</Button></div>
      </Modal>
    </div>
  );
}

function AuditTab() {
  const { backend } = useApp();
  const q = useAsync(() => backend.auditLog(), []);
  if (q.loading) return <Spinner />;
  if (q.error) return <ErrorNote message={q.error} />;
  return (
    <Card>
      <CardHeader title="Audit log" subtitle="Sensitive administrative actions: imports, role and invitation changes, settings, status changes, erasures." />
      {q.data?.length ? (
        <ul className="divide-y divide-slate-100">
          {q.data.map((a) => (
            <li key={a.id} className="grid gap-1 px-5 py-2.5 text-xs sm:grid-cols-[160px_220px_1fr]">
              <span className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
              <span className="font-medium text-navy-900">{a.action}</span>
              <span className="truncate text-slate-500">{JSON.stringify(a.details).slice(0, 160)}</span>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No audit entries yet" />}
    </Card>
  );
}
