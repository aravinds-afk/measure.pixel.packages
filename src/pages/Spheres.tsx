import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Crown, Network, UserPlus } from "lucide-react";
import type { SphereAnalysis } from "@engine/index.ts";
import { useApp, useAsync } from "../lib/app.tsx";
import { Avatar, Badge, Bar, Card, CardHeader, CategoryIcon, EmptyState, ErrorNote, MemberChip, PageHeader, ScorePill, Spinner } from "../components/ui.tsx";

function SphereMap({ s }: { s: SphereAnalysis }) {
  const nodes = s.present.map((p) => p.member);
  const size = 300;
  const cxy = size / 2;
  const rad = size / 2 - 34;
  const pos = new Map(nodes.map((m, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, nodes.length) - Math.PI / 2;
    return [m.id, { x: cxy + rad * Math.cos(a), y: cxy + rad * Math.sin(a) }];
  }));
  const seen = new Set<string>();
  const edges = s.referralDirections.filter((d) => {
    const k = [d.from, d.to].sort().join("|");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (!nodes.length) return null;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[300px]" role="img" aria-label={`Referral connections inside ${s.name}`}>
      {edges.map((e, i) => {
        const a = pos.get(e.from)!;
        const b = pos.get(e.to)!;
        const two = s.referralDirections.some((d) => d.from === e.to && d.to === e.from);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={two ? "#2563eb" : "#94abd6"} strokeWidth={two ? 2 : 1.2} strokeDasharray={two ? undefined : "4 3"} opacity={0.75} />;
      })}
      {nodes.map((m) => {
        const p = pos.get(m.id)!;
        return (
          <g key={m.id}>
            <circle cx={p.x} cy={p.y} r={18} fill="#10264a" stroke="#fff" strokeWidth={2} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fill="#fff" fontWeight={600}>{m.fullName.split(" ").map((x) => x[0]).slice(0, 2).join("")}</text>
            <text x={p.x} y={p.y + 32} textAnchor="middle" fontSize="9" fill="#334155">{m.fullName.split(" ")[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Spheres() {
  const { backend, session, isAdmin, memberById, toast, refreshMembers } = useApp();
  const q = useAsync(() => backend.contactSpheres(session?.memberId ?? undefined), [session?.memberId]);
  const loc = useLocation();
  useEffect(() => {
    if (q.data && loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  }, [q.data, loc.hash]);
  const myFit = useMemo(() => new Map((q.data?.myFit ?? []).map((f) => [f.sphereId, f])), [q.data]);

  return (
    <div>
      <PageHeader title="Contact sphere explorer" subtitle="Groups of complementary professions in this chapter that serve a common customer base. Built from actual members first; missing professions are shown separately as recruitment opportunities." />
      {q.error && <ErrorNote message={q.error} />}
      {q.loading && !q.data ? <Spinner /> : q.data && (
        <div className="space-y-6">
          {q.data.spheres.map((s) => {
            const fit = myFit.get(s.id);
            return (
              <Card key={s.id} id={s.id} className="scroll-mt-20">
                <CardHeader icon={<Network className="h-4 w-4" />} title={s.name} subtitle={s.description}
                  action={s.fitScore != null ? <div className="text-right"><div className="text-[10px] uppercase tracking-wide text-slate-500">Sphere fit</div><ScorePill score={s.fitScore} /></div> : <Badge>Fewer than 2 members</Badge>} />
                <div className="grid gap-6 p-5 lg:grid-cols-[320px_1fr]">
                  <div>
                    <SphereMap s={s} />
                    <div className="mt-2 flex justify-center gap-4 text-[11px] text-slate-500"><span><span className="mr-1 inline-block h-0.5 w-4 bg-blue-600 align-middle" />Two-way</span><span><span className="mr-1 inline-block h-0.5 w-4 border-t border-dashed border-navy-300 align-middle" />One-way</span></div>
                    {s.fitScore != null && (
                      <div className="mt-4 space-y-2 text-xs">
                        {([
                          ["Customer overlap", s.fitBreakdown.customerOverlap],
                          ["Complementary categories", s.fitBreakdown.complementarity],
                          ["Mutual referral opportunities", s.fitBreakdown.mutualReferral],
                          ["Potential referral frequency", s.fitBreakdown.referralFrequency],
                          ["Geographic alignment", s.fitBreakdown.geographic],
                        ] as [string, number | null][]).map(([l, v]) => (
                          <div key={l} className="grid grid-cols-[1fr_90px_28px] items-center gap-2"><span className="text-slate-600">{l}</span><Bar value={v} /><span className="text-right font-semibold">{v ?? "—"}</span></div>
                        ))}
                      </div>
                    )}
                    {fit?.fit != null && <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-navy-900">Your Contact Sphere Fit: <b>{fit.fit}</b>{!fit.inTemplate && " (your profession is adjacent to this sphere)"}</div>}
                  </div>
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Existing sphere — members in this chapter ({s.present.length})</div>
                      {s.present.length ? (
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {s.present.map(({ member, role }) => (
                            <li key={member.id} className="rounded-xl border border-slate-200 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <Link to={`/members/${member.id}`}><MemberChip member={member} /></Link>
                                <div className="flex items-center gap-1">
                                  {s.coordinator?.member.id === member.id && <Badge tone="amber"><Crown className="h-3 w-3" /> Coordinator</Badge>}
                                  {member.sphereIds.includes(s.id) && <Badge tone="green">Recorded</Badge>}
                                </div>
                              </div>
                              <p className="mt-1.5 text-xs text-slate-500">{role}</p>
                              {isAdmin && (
                                <button className="mt-1 text-[11px] font-medium text-blue-700 hover:underline" onClick={async () => {
                                  try { await backend.setSphereMembership(member.id, s.id, !member.sphereIds.includes(s.id)); await refreshMembers(); q.reload(); toast("Sphere membership updated"); } catch (e) { toast((e as Error).message, "error"); }
                                }}>{member.sphereIds.includes(s.id) ? "Remove recorded membership" : "Record as sphere member"}</button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-slate-500">No chapter members in this sphere yet.</p>}
                    </div>
                    {s.strongest.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Strongest member-to-member connections</div>
                        <ul className="space-y-2">
                          {s.strongest.map((c) => (
                            <li key={c.a.id + c.b.id}>
                              <Link to={`/compatibility/${c.a.id}/${c.b.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-300">
                                <ScorePill score={c.score} />
                                <div className="flex -space-x-2"><Avatar member={c.a} size={28} /><Avatar member={c.b} size={28} /></div>
                                <div className="min-w-0 text-sm"><div className="font-medium text-navy-950">{c.a.fullName} + {c.b.fullName}</div><div className="line-clamp-1 text-xs text-slate-500">{c.reason}</div></div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.recommendedOneToOnes.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended one-to-ones to establish the sphere</div>
                        <div className="flex flex-wrap gap-2">
                          {s.recommendedOneToOnes.map((p) => (
                            <Link key={p.a.id + p.b.id} to={`/compatibility/${p.a.id}/${p.b.id}`}><Badge tone="blue" className="py-1">{p.a.fullName.split(" ")[0]} ↔ {p.b.fullName.split(" ")[0]} · {p.score}</Badge></Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.coordinator && <p className="text-xs text-slate-600"><Crown className="mr-1 inline h-3.5 w-3.5 text-amber-600" /><b>Sphere coordinator opportunity:</b> {s.coordinator.member.fullName}. {s.coordinator.reason}</p>}
                    {s.missing.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended structure — missing professions (recruitment opportunities)</div>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {s.missing.map((m) => (
                            <li key={m.categoryId} className="rounded-xl border border-dashed border-slate-300 p-3">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-navy-950"><CategoryIcon categoryId={m.categoryId} /> {m.name}</div>
                              <p className="mt-1 text-xs text-slate-500">{m.role}</p>
                              {m.beneficiaries.length > 0 && <p className="mt-1 text-[11px] text-blue-800">Would exchange referrals with {m.beneficiaries.map((id) => memberById(id)?.fullName.split(" ")[0]).filter(Boolean).join(", ")}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          <Card>
            <CardHeader icon={<UserPlus className="h-4 w-4" />} title="Find missing categories" subtitle="Professions not in the chapter, ranked by how many existing members' clients would need them." />
            {q.data.missing.length ? (
              <ul className="divide-y divide-slate-100">
                {q.data.missing.slice(0, 12).map((m, i) => (
                  <li key={m.categoryId} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2"><span className="w-5 text-xs text-slate-400">{i + 1}</span><CategoryIcon categoryId={m.categoryId} /><span className="text-sm font-medium text-navy-950">{m.name}</span><span className="text-xs text-slate-500">· {m.spheres.join(", ")}</span></div>
                    <div className="text-xs text-slate-600 sm:max-w-md sm:text-right">{m.reason}</div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No missing categories">Every profession in the knowledge base is represented.</EmptyState>}
          </Card>
          <p className="text-[11px] text-slate-400">Sphere templates come from general referral-marketing knowledge. Members are placed by their recorded professional category; members with a custom category are not placed until an admin maps it.</p>
        </div>
      )}
    </div>
  );
}
