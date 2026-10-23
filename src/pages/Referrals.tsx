import { useMemo, useState } from "react";
import { Activity, Plus } from "lucide-react";
import { useApp, useAsync } from "../lib/app.tsx";
import { REFERRAL_STATUSES, type ReferralStatus } from "../lib/backend/index.ts";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorNote, Field, fmtDate, Input, MemberChip, Modal, PageHeader, Select, Spinner, Textarea } from "../components/ui.tsx";

export default function Referrals() {
  const { backend, session, memberById, members, toast, isLeader } = useApp();
  const q = useAsync(() => backend.listReferrals(), []);
  const fb = useAsync(() => backend.myFeedback(), []);
  const [open, setOpen] = useState(false);
  const myId = session?.memberId;
  const mine = (q.data ?? []).filter((r) => r.giverId === myId || r.receiverId === myId);
  const shown = isLeader ? q.data ?? [] : mine;
  const stats = useMemo(() => {
    const given = mine.filter((r) => r.giverId === myId);
    const received = mine.filter((r) => r.receiverId === myId);
    const accepted = (list: typeof mine) => list.filter((r) => ["referral_accepted", "business_meeting_completed", "business_closed"].includes(r.status)).length;
    const partners = new Map<string, number>();
    for (const r of mine) {
      const o = r.giverId === myId ? r.receiverId : r.giverId;
      partners.set(o, (partners.get(o) ?? 0) + 1);
    }
    return {
      given: given.length, received: received.length,
      acceptance: given.length ? Math.round((accepted(given) / given.length) * 100) : null,
      closedValue: received.filter((r) => r.status === "business_closed").reduce((s, r) => s + (r.businessValue ?? 0), 0),
      partners: [...partners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    };
  }, [mine, myId]);
  return (
    <div>
      <PageHeader title="Referral activity tracker" subtitle="Record introductions and outcomes. Only the members involved (and chapter leadership) can see a referral." actions={myId && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Record a referral</Button>} />
      {q.error && <ErrorNote message={q.error} />}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[["Referrals given", stats.given], ["Referrals received", stats.received], ["Acceptance rate (given)", stats.acceptance == null ? "—" : `${stats.acceptance}%`], ["Business received (recorded)", stats.closedValue ? stats.closedValue.toLocaleString() : "—"], ["Recommendations rated", fb.data?.length ?? 0]].map(([l, v]) => (
          <Card key={String(l)} className="p-4"><div className="text-xs text-slate-500">{l}</div><div className="mt-1 font-display text-2xl font-bold text-navy-950">{v}</div></Card>
        ))}
      </div>
      {stats.partners.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your strongest referral partnerships</div>
          <div className="flex flex-wrap gap-4">{stats.partners.map(([id, n]) => <div key={id} className="flex items-center gap-2"><MemberChip member={memberById(id)} /><Badge tone="blue">{n}</Badge></div>)}</div>
        </Card>
      )}
      <Card>
        <CardHeader icon={<Activity className="h-4 w-4" />} title={isLeader ? "All chapter referrals" : "Your referrals"} />
        {q.loading ? <Spinner /> : shown.length ? (
          <ul className="divide-y divide-slate-100">
            {shown.map((r) => {
              const canEdit = r.giverId === myId || r.receiverId === myId;
              return (
                <li key={r.id} className="flex flex-col gap-2 px-5 py-3 lg:flex-row lg:items-center">
                  <div className="flex flex-1 flex-wrap items-center gap-2 text-sm"><MemberChip member={memberById(r.giverId)} /> <span className="text-slate-400">→</span> <MemberChip member={memberById(r.receiverId)} /></div>
                  <div className="text-xs text-slate-500 lg:w-64">{r.description ?? "—"}<div>{fmtDate(r.createdAt)}{r.businessValue ? ` · value ${r.businessValue.toLocaleString()}` : ""}</div></div>
                  {canEdit ? (
                    <Select aria-label="Referral status" className="lg:w-56" value={r.status} onChange={async (e) => { try { await backend.updateReferral(r.id, { status: e.target.value as ReferralStatus }); q.reload(); toast("Referral updated"); } catch (err) { toast((err as Error).message, "error"); } }}>
                      {REFERRAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </Select>
                  ) : <Badge>{REFERRAL_STATUSES.find((s) => s.value === r.status)?.label}</Badge>}
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon={<Activity className="h-5 w-5" />} title="No referrals recorded">When you pass or receive a referral, record it here to build your partnership history.</EmptyState>}
      </Card>
      {myId && <RecordModal open={open} onClose={() => setOpen(false)} myId={myId} members={members} onSaved={() => { setOpen(false); q.reload(); }} />}
    </div>
  );
}

function RecordModal({ open, onClose, myId, members, onSaved }: { open: boolean; onClose: () => void; myId: string; members: ReturnType<typeof useApp>["members"]; onSaved: () => void }) {
  const { backend, toast } = useApp();
  const [direction, setDirection] = useState<"gave" | "received">("gave");
  const [other, setOther] = useState("");
  const [status, setStatus] = useState<ReferralStatus>("introduction_made");
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Record a referral">
      <div className="space-y-3">
        <Field label="Direction"><Select value={direction} onChange={(e) => setDirection(e.target.value as "gave" | "received")}><option value="gave">I gave a referral</option><option value="received">I received a referral</option></Select></Field>
        <Field label={direction === "gave" ? "Given to" : "Received from"}>
          <Select value={other} onChange={(e) => setOther(e.target.value)}><option value="">Select member</option>{members.filter((m) => m.id !== myId && m.status === "active").map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</Select>
        </Field>
        <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as ReferralStatus)}>{REFERRAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
        <Field label="Description" hint="Do not include the client's personal details."><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Manufacturer needing lead generation" /></Field>
        <Field label="Business value (optional, voluntary)"><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Both members agree to this referral being recorded in ConnectSphere.</label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={busy} disabled={!other || !consent} onClick={async () => {
            setBusy(true);
            try {
              const v = value.trim() ? Number(value.replace(/[^\d.]/g, "")) : null;
              await backend.recordReferral({ giverId: direction === "gave" ? myId : other, receiverId: direction === "gave" ? other : myId, status, description: desc || null, businessValue: v != null && Number.isFinite(v) ? v : null, consentConfirmed: consent });
              toast("Referral recorded");
              setOther(""); setDesc(""); setValue(""); setConsent(false);
              onSaved();
            } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
          }}>Record referral</Button>
        </div>
      </div>
    </Modal>
  );
}
