import { Link } from "react-router-dom";
import { BarChart3, ClipboardList, UserPlus } from "lucide-react";
import { useApp, useAsync } from "../lib/app.tsx";
import { Bar, Card, CardHeader, ErrorNote, MemberChip, PageHeader, Spinner } from "../components/ui.tsx";

export default function Analytics() {
  const { backend, memberById } = useApp();
  const q = useAsync(async () => {
    const [a, health, spheres] = await Promise.all([backend.analytics(), backend.health(), backend.contactSpheres()]);
    return { a, health, spheres };
  }, []);
  if (q.error) return <ErrorNote message={q.error} />;
  if (q.loading || !q.data) return <Spinner />;
  const { a, health, spheres } = q.data;
  const acceptance = a.introductions ? Math.round((a.accepted / a.introductions) * 100) : null;
  const maxPart = Math.max(1, ...a.participation.map((p) => p.given + p.received + p.meetings));
  const kpis: [string, string | number, string][] = [
    ["Active members", a.activeMembers, ""],
    ["Introductions made", a.introductions, "Recorded referrals from 'introduction made' onwards"],
    ["Acceptance rate", acceptance == null ? "—" : `${acceptance}%`, "Accepted, met or closed ÷ introductions"],
    ["One-to-ones completed", a.meetingsCompleted, `${a.meetingsPlanned} planned`],
    ["Business generated", a.businessGenerated ? a.businessGenerated.toLocaleString() : "—", "Voluntarily recorded closed value only"],
    ["Recommendation accuracy", a.feedbackUseful + a.feedbackInaccurate ? `${Math.round((a.feedbackUseful / (a.feedbackUseful + a.feedbackInaccurate)) * 100)}% useful` : "—", `${a.feedbackUseful + a.feedbackInaccurate} ratings`],
  ];
  return (
    <div>
      <PageHeader title="Chapter analytics" subtitle="Relationship development and referral activity. Compatibility scores are not revenue forecasts." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, h]) => <Card key={l} className="p-4"><div className="text-xs text-slate-500">{l}</div><div className="mt-1 font-display text-2xl font-bold text-navy-950">{v}</div>{h && <div className="mt-0.5 text-[11px] text-slate-400">{h}</div>}</Card>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<BarChart3 className="h-4 w-4" />} title="Strongest referral partnerships" subtitle="By recorded referrals in both directions." />
          <ul className="divide-y divide-slate-100">
            {a.topPartnerships.map((p) => (
              <li key={p.a + p.b} className="flex items-center justify-between gap-2 px-5 py-3">
                <Link to={`/compatibility/${p.a}/${p.b}`} className="text-sm font-medium text-navy-950 hover:text-blue-700">{memberById(p.a)?.fullName} + {memberById(p.b)?.fullName}</Link>
                <span className="text-sm font-semibold">{p.referrals}</span>
              </li>
            ))}
            {!a.topPartnerships.length && <li className="px-5 py-4 text-sm text-slate-500">No referrals recorded yet.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader icon={<UserPlus className="h-4 w-4" />} title="Underserved spheres & missing categories" />
          <ul className="divide-y divide-slate-100">
            {spheres.spheres.map((s) => (
              <li key={s.id} className="grid grid-cols-[1fr_100px_auto] items-center gap-3 px-5 py-2.5 text-sm">
                <Link to={`/spheres#${s.id}`} className="text-navy-950 hover:text-blue-700">{s.name}</Link>
                <Bar value={s.fitScore} />
                <span className="w-24 text-right text-xs text-slate-500">{s.present.length} in · {s.missing.length} missing</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-600">Top recruitment priorities: {spheres.missing.slice(0, 5).map((m) => m.name).join(", ")}</div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Member participation" subtitle="Referrals given, received and one-to-ones completed per member." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Member</th><th className="px-3 py-2 font-medium">Given</th><th className="px-3 py-2 font-medium">Received</th><th className="px-3 py-2 font-medium">One-to-ones</th><th className="w-48 px-5 py-2 font-medium">Activity</th></tr></thead>
              <tbody>
                {[...a.participation].sort((x, y) => (y.given + y.received + y.meetings) - (x.given + x.received + x.meetings)).map((p) => (
                  <tr key={p.member_id} className="border-b border-slate-50">
                    <td className="px-5 py-2"><MemberChip member={memberById(p.member_id)} /></td>
                    <td className="px-3 py-2">{p.given}</td><td className="px-3 py-2">{p.received}</td><td className="px-3 py-2">{p.meetings}</td>
                    <td className="px-5 py-2"><Bar value={p.given + p.received + p.meetings} max={maxPart} color="#2563eb" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader icon={<ClipboardList className="h-4 w-4" />} title="Profile data quality" subtitle={`Average completeness ${health.averageCompleteness}%. Incomplete profiles produce low-confidence results.`} />
          <ul className="divide-y divide-slate-100">
            {health.incomplete.map((x) => (
              <li key={x.member.id} className="flex flex-col gap-1 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <Link to={`/members/${x.member.id}`}><MemberChip member={x.member} /></Link>
                <span className="text-xs text-slate-500">Missing: {x.missing.join(", ")}</span>
              </li>
            ))}
            {!health.incomplete.length && <li className="px-5 py-4 text-sm text-slate-500">All profiles are reasonably complete.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
