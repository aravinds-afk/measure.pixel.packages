import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarCheck, Mail, Plus, Printer, Save } from "lucide-react";
import type { MeetingBrief } from "@engine/index.ts";
import { useApp, useAsync } from "../lib/app.tsx";
import { IS_ARTIFACT } from "../lib/env.ts";
import type { Meeting } from "../lib/backend/index.ts";
import { MemberPicker } from "../components/MemberPicker.tsx";
import { Avatar, Badge, Button, Card, CardHeader, CopyButton, EmptyState, ErrorNote, Field, fmtDate, Input, MemberChip, Notice, PageHeader, ScorePill, Select, Spinner, Textarea } from "../components/ui.tsx";

function briefText(b: MeetingBrief, an: string, bn: string): string {
  return [
    `One-to-one brief: ${an} + ${bn} (${b.score}/100, ${b.label})`,
    "",
    `Why this meeting is worthwhile: ${b.whyWorthwhile}`,
    "",
    `${an} should learn:`, ...b.learnAbout.aLearns.map((x) => `- ${x}`),
    `${bn} should learn:`, ...b.learnAbout.bLearns.map((x) => `- ${x}`),
    "",
    "Discovery questions:", ...b.discoveryQuestions.map((x, i) => `${i + 1}. ${x}`),
    "",
    `Ideal customer — ${an}: ${b.icpExchange.a}`,
    `Ideal customer — ${bn}: ${b.icpExchange.b}`,
    "",
    "Referral triggers:", ...b.triggers.map((x) => `- ${x}`),
    "",
    "Collaboration ideas:", ...b.collaboration.map((x) => `- ${x}`),
    "",
    `Agreed next action: ${b.nextAction}`,
    `Follow-up date: ${b.followUpDate}`,
  ].join("\n");
}

export default function Meetings() {
  const { backend, session, memberById } = useApp();
  const [params, setParams] = useSearchParams();
  const withId = params.get("with");
  const openId = params.get("id");
  const list = useAsync(() => backend.listMeetings(), []);
  const open = list.data?.find((m) => m.id === openId);

  return (
    <div>
      <PageHeader title="One-to-one meeting planner" subtitle="Every recommended match gets a structured brief: what to learn, what to ask, and what to agree." actions={session?.memberId && <Button onClick={() => setParams({ with: "" })}><Plus className="h-4 w-4" /> New one-to-one</Button>} />
      {list.error && <ErrorNote message={list.error} />}
      {params.has("with") && session?.memberId ? (
        <Planner myId={session.memberId} initial={withId || null} onCreated={(m) => { list.reload(); setParams({ id: m.id }); }} onCancel={() => setParams({})} />
      ) : open ? (
        <MeetingDetail meeting={open} onChange={list.reload} onBack={() => setParams({})} />
      ) : list.loading ? <Spinner /> : (
        <Card>
          <CardHeader icon={<CalendarCheck className="h-4 w-4" />} title="Your one-to-ones" />
          {list.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {list.data.map((m) => {
                const other = memberById(m.memberA === session?.memberId ? m.memberB : m.memberA);
                return (
                  <li key={m.id}>
                    <button onClick={() => setParams({ id: m.id })} className="flex w-full flex-col gap-2 px-5 py-3 text-left hover:bg-slate-50 sm:flex-row sm:items-center">
                      <div className="flex-1"><MemberChip member={other} /></div>
                      <div className="text-xs text-slate-500">{m.scheduledFor ? `Scheduled ${fmtDate(m.scheduledFor)}` : "Not scheduled"} · follow up {fmtDate(m.followUpDate)}</div>
                      <Badge tone={m.status === "completed" ? "green" : m.status === "cancelled" ? "red" : "blue"} className="capitalize">{m.status}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No one-to-ones planned" action={session?.memberId && <Button onClick={() => setParams({ with: "" })}>Plan your first one-to-one</Button>}>Pick one of your top matches and generate a meeting brief.</EmptyState>}
        </Card>
      )}
    </div>
  );
}

function Planner({ myId, initial, onCreated, onCancel }: { myId: string; initial: string | null; onCreated: (m: Meeting) => void; onCancel: () => void }) {
  const { backend, members, memberById, toast } = useApp();
  const [other, setOther] = useState<string | null>(initial);
  const brief = useAsync(() => (other ? backend.brief(myId, other) : Promise.resolve(null)), [other]);
  const [when, setWhen] = useState("");
  const [next, setNext] = useState("");
  const [follow, setFollow] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (brief.data) {
      setNext(brief.data.nextAction);
      setFollow(brief.data.followUpDate);
    }
  }, [brief.data]);
  const me = memberById(myId)!;
  const om = memberById(other);
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="p-4"><MemberPicker label="Meet with" members={members} value={other} onChange={setOther} exclude={myId} /></Card>
      <div>
        {!other ? <Card><EmptyState title="Choose a member">Select who you are meeting to generate the brief.</EmptyState></Card> : brief.loading ? <Spinner label="Preparing brief…" /> : brief.error ? <ErrorNote message={brief.error} /> : brief.data && om && (
          <div className="space-y-4">
            <BriefView b={brief.data} an={me.fullName} bn={om.fullName} />
            <Card className="p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Meeting date & time"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
                <Field label="Follow-up date"><Input type="date" value={follow} onChange={(e) => setFollow(e.target.value)} /></Field>
                <div className="sm:col-span-3"><Field label="Mutually agreed next action"><Textarea value={next} onChange={(e) => setNext(e.target.value)} /></Field></div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button loading={busy} onClick={async () => {
                  setBusy(true);
                  try {
                    const m = await backend.createMeeting({ memberA: myId, memberB: other, scheduledFor: when ? new Date(when).toISOString() : null, status: when ? "scheduled" : "planned", brief: brief.data!, agreedNextAction: next, followUpDate: follow || null, outcomeNotes: null });
                    try {
                      const s = await backend.saveConnection(other, brief.data!.score);
                      if (when && s.status === "recommended") await backend.updateConnection(s.id, { status: "one_to_one_scheduled" });
                    } catch { /* saving the connection is best-effort */ }
                    toast("One-to-one saved");
                    onCreated(m);
                  } catch (e) {
                    toast((e as Error).message, "error");
                  } finally {
                    setBusy(false);
                  }
                }}><Save className="h-4 w-4" /> Save one-to-one</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export function BriefView({ b, an, bn }: { b: MeetingBrief; an: string; bn: string }) {
  const first = (n: string) => n.split(" ")[0];
  const Block = ({ title, items }: { title: string; items: string[] }) => (
    <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div><ul className="space-y-1 text-sm text-slate-700">{items.map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
  );
  return (
    <Card className="print-area">
      <CardHeader title={`One-to-one brief: ${an} + ${bn}`} subtitle={b.label} action={<ScorePill score={b.score} />} />
      <div className="space-y-5 p-5">
        {b.exploratory && <Notice tone="warn">Exploratory: profile data is limited, so treat this brief as a starting point.</Notice>}
        <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Why this meeting is worthwhile</div><p className="text-sm text-slate-700">{b.whyWorthwhile}</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Block title={`What ${first(an)} should learn`} items={b.learnAbout.aLearns} />
          <Block title={`What ${first(bn)} should learn`} items={b.learnAbout.bLearns} />
        </div>
        <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Five discovery questions</div><ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">{b.discoveryQuestions.map((q) => <li key={q}>{q}</li>)}</ol></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{first(an)}'s ideal customer</div><p className="text-sm text-slate-700">{b.icpExchange.a}</p></div>
          <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{first(bn)}'s ideal customer</div><p className="text-sm text-slate-700">{b.icpExchange.b}</p></div>
        </div>
        <Block title="Three referral trigger situations" items={b.triggers} />
        <Block title="Collaboration opportunities" items={b.collaboration} />
        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-navy-900"><b>Suggested next action:</b> {b.nextAction}<div className="mt-1 text-xs">Suggested follow-up: {fmtDate(b.followUpDate)}</div></div>
      </div>
    </Card>
  );
}

function MeetingDetail({ meeting, onChange, onBack }: { meeting: Meeting; onChange: () => void; onBack: () => void }) {
  const { backend, memberById, session, toast } = useApp();
  const a = memberById(meeting.memberA);
  const b = memberById(meeting.memberB);
  const [status, setStatus] = useState(meeting.status);
  const [outcome, setOutcome] = useState(meeting.outcomeNotes ?? "");
  const [next, setNext] = useState(meeting.agreedNextAction ?? "");
  const [follow, setFollow] = useState(meeting.followUpDate ?? "");
  const participant = session?.memberId === meeting.memberA || session?.memberId === meeting.memberB;
  const text = meeting.brief && a && b ? briefText(meeting.brief, a.fullName, b.fullName) : "";
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="text-sm text-blue-700 hover:underline">← All one-to-ones</button>
        <div className="flex flex-wrap gap-2">
          {text && <CopyButton text={text} label="Copy brief" />}
          {text && <a href={`mailto:?subject=${encodeURIComponent("One-to-one brief")}&body=${encodeURIComponent(text)}`}><Button variant="secondary" size="sm"><Mail className="h-3.5 w-3.5" /> Email</Button></a>}
          {text && <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><Button variant="secondary" size="sm">WhatsApp</Button></a>}
          {!IS_ARTIFACT && <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Export PDF</Button>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2"><Avatar member={a} size={36} /><Avatar member={b} size={36} /></div>
        <div className="text-sm text-slate-600">{meeting.scheduledFor ? `Scheduled for ${new Date(meeting.scheduledFor).toLocaleString()}` : "Not yet scheduled"} · <Link className="text-blue-700 hover:underline" to={`/compatibility/${meeting.memberA}/${meeting.memberB}`}>compatibility report</Link></div>
      </div>
      {meeting.brief && a && b && <BriefView b={meeting.brief} an={a.fullName} bn={b.fullName} />}
      <Card className="no-print p-5">
        <h2 className="mb-3 text-sm font-semibold text-navy-950">Record outcomes</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status"><Select value={status} disabled={!participant} onChange={(e) => setStatus(e.target.value as Meeting["status"])}><option value="planned">Planned</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></Select></Field>
          <Field label="Follow-up date"><Input type="date" disabled={!participant} value={follow} onChange={(e) => setFollow(e.target.value)} /></Field>
          <div className="sm:col-span-3"><Field label="Agreed next action"><Textarea disabled={!participant} value={next} onChange={(e) => setNext(e.target.value)} /></Field></div>
          <div className="sm:col-span-3"><Field label="Outcome notes" hint="What you learned, introductions promised, and anything to follow up."><Textarea disabled={!participant} value={outcome} onChange={(e) => setOutcome(e.target.value)} /></Field></div>
        </div>
        {participant && <div className="mt-4 flex justify-end"><Button onClick={async () => {
          try {
            await backend.updateMeeting(meeting.id, { status, outcomeNotes: outcome || null, agreedNextAction: next || null, followUpDate: follow || null });
            if (status === "completed") {
              const other = session?.memberId === meeting.memberA ? meeting.memberB : meeting.memberA;
              const saved = (await backend.listSaved()).find((s) => s.targetMemberId === other);
              if (saved && ["recommended", "one_to_one_scheduled"].includes(saved.status)) await backend.updateConnection(saved.id, { status: "one_to_one_completed" });
            }
            toast("Meeting updated");
            onChange();
          } catch (e) { toast((e as Error).message, "error"); }
        }}><Save className="h-4 w-4" /> Save outcome</Button></div>}
      </Card>
    </div>
  );
}
