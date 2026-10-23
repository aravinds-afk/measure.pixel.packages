import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Filter, MapPin, Search, Users } from "lucide-react";
import { CATEGORIES, SPHERES, getCategory, matchSets, tokens, type MemberProfile } from "@engine/index.ts";
import { useApp, useAsync } from "../lib/app.tsx";
import { Avatar, Badge, Button, Card, CategoryIcon, categoryName, ConfidenceBadge, EmptyState, Input, PageHeader, ScorePill, Select } from "../components/ui.tsx";

const textHit = (m: MemberProfile, q: string, fields: (keyof MemberProfile)[]) => {
  const qt = tokens(q);
  if (!qt.length) return true;
  const hay = new Set(fields.flatMap((f) => {
    const v = m[f];
    return Array.isArray(v) ? v.flatMap((x) => (typeof x === "string" ? tokens(x) : [])) : typeof v === "string" ? tokens(v) : [];
  }));
  return qt.every((t) => [...hay].some((h) => h.startsWith(t)));
};

export default function Directory() {
  const { backend, members, session, isLeader } = useApp();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const f = {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    industry: params.get("industry") ?? "",
    location: params.get("location") ?? "",
    customer: params.get("customer") ?? "",
    service: params.get("service") ?? "",
    sphere: params.get("sphere") ?? "",
    minScore: Number(params.get("minScore") ?? 0),
    referral: params.get("referral") ?? "",
    sort: params.get("sort") ?? (session?.memberId ? "score" : "name"),
    status: params.get("status") ?? "active",
  };
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const scores = useAsync(async () => (session?.memberId ? backend.bestMatches(session.memberId, 500) : []), [session?.memberId, members.length]);
  const scoreOf = useMemo(() => new Map((scores.data ?? []).map((s) => [s.member.id, s])), [scores.data]);

  const filtered = useMemo(() => {
    let list = members.filter((m) => (f.status === "all" ? true : m.status === f.status));
    if (f.q) list = list.filter((m) => textHit(m, f.q, ["fullName", "company", "categoryLabel", "keywords", "services", "businessDescription"]));
    if (f.category) list = list.filter((m) => (f.category === "_unmapped" ? !m.categoryId : m.categoryId === f.category));
    if (f.industry) list = list.filter((m) => matchSets(m.industries, [f.industry]).shared.length > 0);
    if (f.location) list = list.filter((m) => textHit(m, f.location, ["serviceAreas"]));
    if (f.customer) list = list.filter((m) => matchSets(m.customerSegments, [f.customer]).shared.length > 0 || textHit(m, f.customer, ["customerSegments", "icpDescription"]));
    if (f.service) list = list.filter((m) => textHit(m, f.service, ["services", "problemsSolved", "keywords"]));
    if (f.sphere) list = list.filter((m) => getCategory(m.categoryId)?.spheres.includes(f.sphere) || m.sphereIds.includes(f.sphere));
    if (f.minScore) list = list.filter((m) => (scoreOf.get(m.id)?.score ?? 0) >= f.minScore);
    if (f.referral === "give") list = list.filter((m) => (scoreOf.get(m.id)?.directional.aToB ?? 0) >= 50);
    if (f.referral === "receive") list = list.filter((m) => (scoreOf.get(m.id)?.directional.bToA ?? 0) >= 50);
    if (f.sort === "score") list = [...list].sort((a, b) => (scoreOf.get(b.id)?.score ?? -1) - (scoreOf.get(a.id)?.score ?? -1));
    else list = [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
    return list;
  }, [members, f.q, f.category, f.industry, f.location, f.customer, f.service, f.sphere, f.minScore, f.referral, f.sort, f.status, scoreOf]);

  const industries = useMemo(() => [...new Set(members.flatMap((m) => m.industries))].sort(), [members]);
  const customers = useMemo(() => [...new Set(members.flatMap((m) => m.customerSegments))].sort(), [members]);
  const presentCats = new Set(members.map((m) => m.categoryId));
  const activeFilters = ["category", "industry", "location", "customer", "service", "sphere", "minScore", "referral"].filter((k) => params.get(k)).length;

  return (
    <div>
      <PageHeader title="Member directory" subtitle={`${members.filter((m) => m.status === "active").length} active members. Scores are your personal compatibility with each member.`} />
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input aria-label="Search members" placeholder="Search by name, company, service or keyword" value={f.q} onChange={(e) => set("q", e.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Sort" value={f.sort} onChange={(e) => set("sort", e.target.value)} className="sm:w-48">
            {session?.memberId && <option value="score">Sort: best match</option>}
            <option value="name">Sort: name</option>
          </Select>
          <Button variant="secondary" onClick={() => setShowFilters((s) => !s)}><Filter className="h-4 w-4" /> Filters{activeFilters ? ` (${activeFilters})` : ""}</Button>
        </div>
        {showFilters && (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select aria-label="Professional category" value={f.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.filter((c) => presentCats.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="_unmapped">Custom / unmapped</option>
            </Select>
            <Select aria-label="Industry" value={f.industry} onChange={(e) => set("industry", e.target.value)}>
              <option value="">All industries</option>
              {industries.map((i) => <option key={i}>{i}</option>)}
            </Select>
            <Select aria-label="Customer type" value={f.customer} onChange={(e) => set("customer", e.target.value)}>
              <option value="">All customer types</option>
              {customers.map((i) => <option key={i}>{i}</option>)}
            </Select>
            <Select aria-label="Contact sphere" value={f.sphere} onChange={(e) => set("sphere", e.target.value)}>
              <option value="">All contact spheres</option>
              {SPHERES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input aria-label="Location" placeholder="Location (e.g. Chennai)" value={f.location} onChange={(e) => set("location", e.target.value)} />
            <Input aria-label="Services or problems" placeholder="Services offered / problem" value={f.service} onChange={(e) => set("service", e.target.value)} />
            {session?.memberId && (
              <>
                <Select aria-label="Minimum compatibility" value={String(f.minScore || "")} onChange={(e) => set("minScore", e.target.value)}>
                  <option value="">Any compatibility</option>
                  <option value="90">90+ Exceptional</option>
                  <option value="75">75+ Strong</option>
                  <option value="60">60+ Promising</option>
                  <option value="40">40+ Explore</option>
                </Select>
                <Select aria-label="Referral potential" value={f.referral} onChange={(e) => set("referral", e.target.value)}>
                  <option value="">Any referral potential</option>
                  <option value="give">I can refer them often</option>
                  <option value="receive">They can refer me often</option>
                </Select>
              </>
            )}
            {isLeader && (
              <Select aria-label="Status" value={f.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active members</option>
                <option value="inactive">Inactive members</option>
                <option value="all">All members</option>
              </Select>
            )}
            <Button variant="ghost" onClick={() => setParams(new URLSearchParams(f.q ? { q: f.q } : {}), { replace: true })}>Clear filters</Button>
          </div>
        )}
      </Card>
      {!filtered.length ? (
        <Card><EmptyState icon={<Users className="h-5 w-5" />} title="No members match">Try removing a filter or searching for a broader term.</EmptyState></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const s = scoreOf.get(m.id);
            const isMe = m.id === session?.memberId;
            return (
              <Card key={m.id} className="flex min-w-0 flex-col p-4 transition hover:border-blue-200 hover:shadow-md">
                <Link to={`/members/${m.id}`} className="flex items-start gap-3">
                  <Avatar member={m} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-navy-950">{m.fullName}</div>
                        <div className="truncate text-xs text-slate-500">{m.company}</div>
                      </div>
                      {s && !isMe && <ScorePill score={s.score} />}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-navy-800">
                      <CategoryIcon categoryId={m.categoryId} className="h-3.5 w-3.5" /> {categoryName(m)}
                      {!m.categoryId && <Badge tone="amber">Custom</Badge>}
                    </div>
                  </div>
                </Link>
                <div className="mt-3 flex flex-wrap gap-1">
                  {m.services.slice(0, 3).map((x) => <Badge key={x}>{x}</Badge>)}
                  {m.serviceAreas.length > 0 && <Badge tone="blue"><MapPin className="h-3 w-3" /> {m.serviceAreas.slice(0, 2).join(", ")}</Badge>}
                  {m.status === "inactive" && <Badge tone="red">Inactive</Badge>}
                  {isMe && <Badge tone="navy">You</Badge>}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  {s && !isMe ? <ConfidenceBadge level={s.confidence} /> : <span />}
                  {!isMe && session?.memberId && m.status === "active" && (
                    <Link to={`/compatibility/${session.memberId}/${m.id}`} className="text-xs font-semibold text-blue-700 hover:underline">View compatibility →</Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
