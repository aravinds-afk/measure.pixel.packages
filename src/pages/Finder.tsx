import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Compass, Search } from "lucide-react";
import type { PartnerHit } from "@engine/index.ts";
import { useApp, useAsync } from "../lib/app.tsx";
import { Badge, Bar, Button, Card, CardHeader, ConfidenceBadge, EmptyState, ErrorNote, Input, MemberChip, PageHeader, ScorePill, Spinner, Tabs } from "../components/ui.tsx";

const EXAMPLES = ["manufacturer struggling to get leads", "cash flow problems", "moving into a new office", "family buying a home", "planning a product launch", "hiring a sales team"];

export default function Finder() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as "partner" | "next" | "best") ?? "partner";
  const { session } = useApp();
  return (
    <div>
      <PageHeader title="Referral opportunity finder" subtitle="Find who in the chapter can help a customer, what to listen for in your own network, and your strongest matches." />
      <div className="mb-5">
        <Tabs value={tab} onChange={(v) => setParams({ tab: v })} tabs={[
          { value: "partner", label: "Find a referral partner" },
          ...(session?.memberId ? [{ value: "next" as const, label: "Find my next referral" }, { value: "best" as const, label: "Find my best matches" }] : []),
        ]} />
      </div>
      {tab === "partner" && <PartnerSearch />}
      {tab === "next" && session?.memberId && <NextReferrals memberId={session.memberId} />}
      {tab === "best" && session?.memberId && <BestMatches memberId={session.memberId} />}
    </div>
  );
}

function PartnerSearch() {
  const { backend, session } = useApp();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PartnerHit[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (q: string) => {
    setQuery(q);
    setBusy(true);
    setErr(null);
    try {
      setHits(await backend.findPartner(q, session?.memberId ?? undefined));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <Card className="p-4">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); run(query); }}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input aria-label="Customer type or problem" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Describe the customer or problem, e.g. “clinic needs a new website”" className="pl-9" />
          </div>
          <Button type="submit" loading={busy} disabled={!query.trim()}>Find partners</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">{EXAMPLES.map((e) => <button key={e} onClick={() => run(e)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700">{e}</button>)}</div>
      </Card>
      {err && <ErrorNote message={err} />}
      {hits && (
        <Card>
          <CardHeader title={`${hits.length} member${hits.length === 1 ? "" : "s"} can help`} subtitle="Ranked by how well their profile matches. Profession-knowledge matches are labelled." />
          {hits.length ? (
            <ul className="divide-y divide-slate-100">
              {hits.map((h) => (
                <li key={h.member.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                  <div className="sm:w-64"><Link to={`/members/${h.member.id}`}><MemberChip member={h.member} /></Link></div>
                  <div className="flex-1 text-xs text-slate-600">{h.reasons.slice(0, 2).map((r, i) => <div key={i}>{r}</div>)}</div>
                  <div className="flex items-center gap-2 sm:w-48">
                    <Bar value={h.relevance} color="#2563eb" />
                    {h.basis === "profession_knowledge" ? <Badge tone="slate">Typical</Badge> : <Badge tone="blue">Profile</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={<Compass className="h-5 w-5" />} title="No matching members">Try different words, or check “Find missing categories” in Contact spheres — this may be a profession to recruit.</EmptyState>}
        </Card>
      )}
    </div>
  );
}

function NextReferrals({ memberId }: { memberId: string }) {
  const { backend } = useApp();
  const q = useAsync(() => backend.nextReferrals(memberId), [memberId]);
  if (q.error) return <ErrorNote message={q.error} />;
  if (q.loading) return <Spinner />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(q.data ?? []).map((n) => (
        <Card key={n.opportunity.id} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/members/${n.receiver.id}`}><MemberChip member={n.receiver} /></Link>
            <ConfidenceBadge level={n.opportunity.confidence} />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-navy-950">{n.opportunity.title}</h3>
          <p className="mt-1 text-xs text-slate-600">{n.opportunity.relevance}</p>
          <div className="mt-2 flex flex-wrap gap-1">{n.opportunity.triggerWords.slice(0, 5).map((w) => <Badge key={w} tone="blue">“{w}”</Badge>)}</div>
          {n.opportunity.lookFor.length > 0 && <p className="mt-2 text-xs text-slate-500">Look for: {n.opportunity.lookFor.slice(0, 3).join(", ")}</p>}
          <div className="mt-3 flex justify-end"><Link to={`/compatibility/${memberId}/${n.receiver.id}`} className="text-xs font-semibold text-blue-700 hover:underline">Full report & scripts →</Link></div>
        </Card>
      ))}
      {!q.data?.length && <Card className="md:col-span-2"><EmptyState title="No opportunities yet">Complete your profile so ConnectSphere can identify referral triggers.</EmptyState></Card>}
    </div>
  );
}

function BestMatches({ memberId }: { memberId: string }) {
  const { backend } = useApp();
  const q = useAsync(() => backend.bestMatches(memberId, 10), [memberId]);
  if (q.error) return <ErrorNote message={q.error} />;
  if (q.loading) return <Spinner />;
  return (
    <Card>
      <CardHeader title="Your top 10 most compatible members" subtitle="Direct competitors are listed last." />
      <ul className="divide-y divide-slate-100">
        {(q.data ?? []).map((m, i) => (
          <li key={m.member.id}>
            <Link to={`/compatibility/${memberId}/${m.member.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
              <span className="w-5 text-xs text-slate-400">{i + 1}</span>
              <ScorePill score={m.score} />
              <div className="min-w-0 flex-1"><MemberChip member={m.member} sub={m.label} /></div>
              <div className="hidden text-right text-[11px] text-slate-500 sm:block">You → them {m.directional.aToB} · them → you {m.directional.bToA}</div>
              <ConfidenceBadge level={m.confidence} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
