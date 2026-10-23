import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Trash2 } from "lucide-react";
import { useApp, useAsync } from "../lib/app.tsx";
import { CONNECTION_STATUSES, type ConnectionStatus, type SavedConnection } from "../lib/backend/index.ts";
import { Badge, Button, Card, EmptyState, ErrorNote, fmtDate, MemberChip, PageHeader, ScorePill, Select, Spinner, Textarea } from "../components/ui.tsx";

export default function Saved() {
  const { backend, memberById, session, toast } = useApp();
  const q = useAsync(() => backend.listSaved(), []);
  const [filter, setFilter] = useState<ConnectionStatus | "">("");
  if (!session?.memberId) return <ErrorNote message="Your account is not linked to a member profile." />;
  const list = (q.data ?? []).filter((s) => !filter || s.status === filter);
  const counts = new Map<string, number>();
  for (const s of q.data ?? []) counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
  return (
    <div>
      <PageHeader title="Saved connections" subtitle="Your relationship pipeline — from recommendation to closed business." />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilter("")} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${!filter ? "bg-navy-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>All ({q.data?.length ?? 0})</button>
        {CONNECTION_STATUSES.map((s) => (
          <button key={s.value} onClick={() => setFilter(s.value)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${filter === s.value ? "bg-navy-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{s.label} ({counts.get(s.value) ?? 0})</button>
        ))}
      </div>
      {q.error && <ErrorNote message={q.error} />}
      {q.loading ? <Spinner /> : !list.length ? (
        <Card><EmptyState icon={<Bookmark className="h-5 w-5" />} title="No saved connections" action={<Link to="/find?tab=best"><Button>Find your best matches</Button></Link>}>Save promising matches from a compatibility report to plan one-to-ones and track progress.</EmptyState></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((s) => <ConnectionCard key={s.id} s={s} onChange={q.reload} myId={session.memberId!} memberById={memberById} toast={toast} />)}
        </div>
      )}
    </div>
  );
}

function ConnectionCard({ s, onChange, myId, memberById, toast }: { s: SavedConnection; onChange: () => void; myId: string; memberById: ReturnType<typeof useApp>["memberById"]; toast: ReturnType<typeof useApp>["toast"] }) {
  const { backend } = useApp();
  const [notes, setNotes] = useState(s.notes ?? "");
  const m = memberById(s.targetMemberId);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/members/${s.targetMemberId}`}><MemberChip member={m} /></Link>
        {s.score != null && <ScorePill score={s.score} />}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Select aria-label="Status" value={s.status} onChange={async (e) => { try { await backend.updateConnection(s.id, { status: e.target.value as ConnectionStatus }); toast("Status updated"); onChange(); } catch (err) { toast((err as Error).message, "error"); } }}>
          {CONNECTION_STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <div className="flex gap-1">
          <Link to={`/compatibility/${myId}/${s.targetMemberId}`}><Button variant="secondary" size="sm">Report</Button></Link>
          <Link to={`/meetings?with=${s.targetMemberId}`}><Button variant="secondary" size="sm">Plan</Button></Link>
          <Button variant="ghost" size="sm" aria-label="Remove" onClick={async () => { await backend.removeConnection(s.id); onChange(); }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <Textarea aria-label="Notes" className="mt-3 min-h-[60px] text-[13px]" placeholder="Notes for this relationship" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={async () => { if (notes !== (s.notes ?? "")) { await backend.updateConnection(s.id, { notes }); toast("Notes saved"); } }} />
      {s.events.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
          {s.events.slice(0, 4).map((e, i) => <Badge key={i}>{CONNECTION_STATUSES.find((c) => c.value === e.to)?.label} · {fmtDate(e.at)}</Badge>)}
        </div>
      )}
    </Card>
  );
}
