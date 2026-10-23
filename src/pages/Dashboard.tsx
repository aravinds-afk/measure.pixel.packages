import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, CalendarCheck, CheckCircle2, Circle, Compass, Lightbulb, Network, UserPlus, Users } from "lucide-react";
import { useApp, useAsync } from "../lib/app.tsx";
import { CONNECTION_STATUSES } from "../lib/backend/index.ts";
import { Badge, Bar, Button, Card, CardHeader, ConfidenceBadge, EmptyState, ErrorNote, fmtDate, MemberChip, Notice, PageHeader, ScorePill, Spinner } from "../components/ui.tsx";

function weekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-w${Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)}`;
}

export default function Dashboard() {
  const { backend, session, me, memberById, toast } = useApp();
  const myId = session?.memberId ?? null;
  const q = useAsync(async () => {
    const [matches, next, spheres, meetings, saved, referrals] = await Promise.all([
      myId ? backend.bestMatches(myId, 10) : Promise.resolve([]),
      myId ? backend.nextReferrals(myId) : Promise.resolve([]),
      backend.contactSpheres(myId ?? undefined),
      backend.listMeetings(),
      backend.listSaved(),
      backend.listReferrals(),
    ]);
    return { matches, next, spheres, meetings, saved, referrals };
  }, [myId]);

  const ck = `connectsphere-checklist-${session?.userId}-${weekKey()}`;
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(ck) ?? "{}");
    } catch {
      return {};
    }
  });
  const toggle = (k: string) => {
    const v = { ...done, [k]: !done[k] };
    setDone(v);
    try {
      localStorage.setItem(ck, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };

  const derived = useMemo(() => {
    if (!q.data) return null;
    const { matches, meetings, saved, next, referrals } = q.data;
    const metWith = new Set(meetings.flatMap((m) => [m.memberA, m.memberB]));
    const toMeet = matches.filter((m) => !m.isCompetitor && !metWith.has(m.member.id)).slice(0, 3);
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const followUps = [
      ...meetings.filter((m) => m.status !== "completed" && m.status !== "cancelled" && m.followUpDate && m.followUpDate <= soon).map((m) => ({
        key: `meeting-${m.id}`, text: `Follow up on one-to-one with ${memberById(m.memberA === myId ? m.memberB : m.memberA)?.fullName ?? "member"}`, due: m.followUpDate!, overdue: m.followUpDate! < today, to: "/meetings",
      })),
      ...saved.filter((s) => !["business_closed", "not_suitable"].includes(s.status) && Date.now() - new Date(s.updatedAt).getTime() > 14 * 86400000).map((s) => ({
        key: `saved-${s.id}`, text: `${memberById(s.targetMemberId)?.fullName}: no progress in 2 weeks (${CONNECTION_STATUSES.find((c) => c.value === s.status)?.label})`, due: s.updatedAt.slice(0, 10), overdue: true, to: "/saved",
      })),
    ];
    const checklist = [
      ...toMeet.slice(0, 2).map((m) => ({ key: `meet-${m.member.id}`, text: `Book a one-to-one with ${m.member.fullName} (${m.score}/100)`, to: `/compatibility/${myId}/${m.member.id}` })),
      ...next.slice(0, 2).map((n) => ({ key: `look-${n.opportunity.id}`, text: `Listen for: “${n.opportunity.triggerWords[0] ?? n.opportunity.title}” → ${n.receiver.fullName}`, to: `/compatibility/${myId}/${n.receiver.id}` })),
      ...followUps.slice(0, 2).map((f) => ({ key: f.key, text: f.text, to: f.to })),
      ...(me && (me.customerSegments.length === 0 || me.services.length === 0) ? [{ key: "profile", text: "Complete your profile so matches can be scored with confidence", to: `/members/${myId}` }] : []),
    ];
    const recent = referrals.slice(0, 5);
    return { toMeet, followUps, checklist, recent };
  }, [q.data, memberById, myId, me]);

  return (
    <div>
      <PageHeader
        title={me ? `Good to see you, ${me.fullName.split(" ")[0]}` : "Chapter dashboard"}
        subtitle="Your highest-potential referral relationships and what to do about them this week."
        actions={<><Link to="/compatibility"><Button variant="secondary">Check compatibility</Button></Link><Link to="/find"><Button>Find a referral partner</Button></Link></>}
      />
      {!myId && backend.workspace === "private" && (
        <div className="mb-6"><Notice>
          {q.data && !q.data.spheres.spheres.some((s) => s.present.length) ? <>Start by <Link className="font-medium text-blue-700 underline" to="/admin/import">importing your chapter roster</Link>. </> : null}
          Then <Link className="font-medium text-blue-700 underline" to="/settings">choose which member you are</Link> to see your personal matches and referral opportunities.
        </Notice></div>
      )}
      {!myId && backend.workspace !== "private" && <div className="mb-6"><Notice>Your account is not linked to a member profile, so personal matches are hidden. Chapter-level insights are shown below.</Notice></div>}
      {q.error && <ErrorNote message={q.error} />}
      {q.loading && !q.data ? <Spinner /> : q.data && derived && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            {myId && (
              <Card>
                <CardHeader icon={<Users className="h-4 w-4" />} title="Top five potential referral partners" subtitle="Ranked by compatibility, discounted for low-confidence data. Potential, not proven." action={<Link to="/members?sort=score" className="text-xs font-medium text-blue-700 hover:underline">All matches</Link>} />
                <ul className="divide-y divide-slate-100">
                  {q.data.matches.slice(0, 5).map((m) => (
                    <li key={m.member.id}>
                      <Link to={`/compatibility/${myId}/${m.member.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                        <ScorePill score={m.score} />
                        <div className="min-w-0 flex-1">
                          <MemberChip member={m.member} />
                          <p className="mt-1 line-clamp-1 pl-11 text-xs text-slate-500">{m.topReason}</p>
                        </div>
                        <div className="hidden sm:block"><ConfidenceBadge level={m.confidence} /></div>
                        <ArrowRight className="h-4 w-4 text-slate-300" />
                      </Link>
                    </li>
                  ))}
                  {!q.data.matches.length && <EmptyState title="No matches yet">Matches appear once the chapter has other active members.</EmptyState>}
                </ul>
              </Card>
            )}
            {myId && (
              <Card>
                <CardHeader icon={<Lightbulb className="h-4 w-4" />} title="Referral opportunities to look for this week" subtitle="Situations in your own network that create a need for a fellow member." action={<Link to="/find?tab=next" className="text-xs font-medium text-blue-700 hover:underline">See all</Link>} />
                <ul className="divide-y divide-slate-100">
                  {q.data.next.slice(0, 4).map((n) => (
                    <li key={n.opportunity.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-navy-950">{n.opportunity.title}</div>
                        <ConfidenceBadge level={n.opportunity.confidence} />
                      </div>
                      <div className="mt-1 text-xs text-slate-600">Refer to <Link className="font-medium text-blue-700 hover:underline" to={`/members/${n.receiver.id}`}>{n.receiver.fullName}</Link> · listen for {n.opportunity.triggerWords.slice(0, 3).map((w) => `“${w}”`).join(", ")}</div>
                    </li>
                  ))}
                  {!q.data.next.length && <EmptyState title="No opportunities identified">Complete your profile to unlock specific referral triggers.</EmptyState>}
                </ul>
              </Card>
            )}
            <Card>
              <CardHeader icon={<Network className="h-4 w-4" />} title="Contact spheres with strong potential" subtitle="Built from this chapter's actual members." action={<Link to="/spheres" className="text-xs font-medium text-blue-700 hover:underline">Explore spheres</Link>} />
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                {q.data.spheres.spheres.filter((s) => s.fitScore != null).slice(0, 3).map((s) => {
                  const mine = q.data!.spheres.myFit.find((f) => f.sphereId === s.id);
                  return (
                    <Link key={s.id} to={`/spheres#${s.id}`} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300">
                      <div className="text-sm font-semibold text-navy-950">{s.name}</div>
                      <div className="mt-2 flex items-center gap-2"><Bar value={s.fitScore} /><span className="text-xs font-semibold text-slate-700">{s.fitScore}</span></div>
                      <div className="mt-2 text-xs text-slate-500">{s.present.length} members · {s.missing.length} missing professions</div>
                      {mine?.fit != null && <div className="mt-1 text-xs text-blue-700">Your fit: {mine.fit}</div>}
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader icon={<CheckCircle2 className="h-4 w-4" />} title="This week's actions" subtitle="Tick them off as you go." />
              <ul className="space-y-1 p-3">
                {derived.checklist.map((c) => (
                  <li key={c.key} className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                    <button onClick={() => toggle(c.key)} aria-label={done[c.key] ? "Mark not done" : "Mark done"} className="mt-0.5 text-blue-700">
                      {done[c.key] ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-slate-300" />}
                    </button>
                    <Link to={c.to} className={`text-sm ${done[c.key] ? "text-slate-400 line-through" : "text-slate-800"} hover:text-blue-700`}>{c.text}</Link>
                  </li>
                ))}
                {!derived.checklist.length && <li className="px-2 py-4 text-sm text-slate-500">Nothing pending — great work.</li>}
              </ul>
            </Card>
            {myId && (
              <Card>
                <CardHeader icon={<CalendarCheck className="h-4 w-4" />} title="Members to meet next" />
                <ul className="divide-y divide-slate-100">
                  {derived.toMeet.map((m) => (
                    <li key={m.member.id} className="flex items-center justify-between gap-2 px-5 py-3">
                      <MemberChip member={m.member} />
                      <Link to={`/meetings?with=${m.member.id}`}><Button size="sm" variant="secondary">Plan</Button></Link>
                    </li>
                  ))}
                  {!derived.toMeet.length && <li className="px-5 py-4 text-sm text-slate-500">You have met all your top matches.</li>}
                </ul>
              </Card>
            )}
            <Card>
              <CardHeader icon={<Bookmark className="h-4 w-4" />} title="Needs a follow-up" />
              <ul className="divide-y divide-slate-100">
                {derived.followUps.map((f) => (
                  <li key={f.key} className="px-5 py-3 text-sm">
                    <Link to={f.to} className="text-slate-800 hover:text-blue-700">{f.text}</Link>
                    <div className="mt-0.5 text-xs">{f.overdue ? <Badge tone="amber">Overdue</Badge> : <span className="text-slate-500">Due {fmtDate(f.due)}</span>}</div>
                  </li>
                ))}
                {!derived.followUps.length && <li className="px-5 py-4 text-sm text-slate-500">No follow-ups due.</li>}
              </ul>
            </Card>
            <Card>
              <CardHeader icon={<UserPlus className="h-4 w-4" />} title="Missing professions" subtitle="Recruitment opportunities for stronger spheres." />
              <ul className="divide-y divide-slate-100">
                {q.data.spheres.missing.slice(0, 4).map((m) => (
                  <li key={m.categoryId} className="px-5 py-3">
                    <div className="text-sm font-medium text-navy-950">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.reason}</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader icon={<Compass className="h-4 w-4" />} title="Recent referral activity" action={<Link to="/referrals" className="text-xs font-medium text-blue-700 hover:underline">Tracker</Link>} />
              <ul className="divide-y divide-slate-100">
                {derived.recent.map((r) => (
                  <li key={r.id} className="px-5 py-3 text-sm">
                    <span className="font-medium">{memberById(r.giverId)?.fullName ?? "Member"}</span> → <span className="font-medium">{memberById(r.receiverId)?.fullName ?? "Member"}</span>
                    <div className="text-xs text-slate-500">{CONNECTION_STATUSES.find((c) => c.value === r.status)?.label} · {fmtDate(r.createdAt)}</div>
                  </li>
                ))}
                {!derived.recent.length && <li className="px-5 py-4 text-sm text-slate-500">No referrals recorded yet.</li>}
              </ul>
              <div className="px-5 pb-4"><Button variant="ghost" size="sm" onClick={() => { q.reload(); toast("Dashboard refreshed", "info"); }}>Refresh</Button></div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
