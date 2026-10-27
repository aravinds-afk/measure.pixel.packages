"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, idempotencyKey } from "@/lib/api-client";
import { formatBand } from "@/lib/money";
import type { OfferRecommendation, RecommendationResult, ServiceRecommendation } from "@/lib/recommend";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, cx, Empty, Notice, Select, Spinner } from "@/components/ui";
import { statusLabel, type Ref } from "./types";

type Decision = "pending" | "accepted" | "removed" | "deferred";

export function RecommendStep({ auditId, ref_, beforeLoad }: { auditId: string; ref_: Ref; beforeLoad: () => Promise<unknown> }) {
  const router = useRouter();
  const toast = useToast();
  const quoteKey = useMemo(() => idempotencyKey(), []);
  const [data, setData] = useState<{ result: RecommendationResult; decisions: Record<string, Decision> } | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await beforeLoad();
      try {
        const res = await api<{ result: RecommendationResult; decisions: Record<string, Decision> }>(`/api/audits/${auditId}/recommendations`);
        if (cancelled) return;
        setData(res);
        const d: Record<string, Decision> = {};
        for (const o of res.result.offers) d[o.key] = res.decisions[o.key] ?? "accepted";
        for (const x of res.result.supporting) d[x.key] = res.decisions[x.key] ?? "accepted";
        for (const [k, v] of Object.entries(res.decisions)) if (!(k in d)) d[k] = v;
        setDecisions(d);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditId, beforeLoad]);

  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data) return <div className="flex items-center gap-3 py-10 text-ink-2"><Spinner /> Working out recommendations from the audit…</div>;

  const { result } = data;
  const set = (key: string, d: Decision) => setDecisions((x) => ({ ...x, [key]: d }));
  const acceptedCount = Object.values(decisions).filter((d) => d === "accepted").length;
  const added = Object.entries(decisions).filter(([k, v]) => v === "accepted" && ![...result.offers, ...result.otherOffers, ...result.supporting].some((r) => r.key === k) && !result.inPlace.some((r) => r.key === k));

  const build = async () => {
    setBuilding(true);
    try {
      const saved = await api<{ sync: { status: string; error?: string } }>(`/api/audits/${auditId}/recommendations`, { method: "PUT", body: { decisions } });
      if (saved.sync.status === "failed") toast("warn", `Recommendations saved. Google Sheets: ${saved.sync.error} — will retry.`);
      const q = await api<{ quoteId: string }>("/api/quotes", { body: { auditId, idempotencyKey: quoteKey } });
      router.push(`/quotes/${q.quoteId}`);
    } catch (e) {
      toast("danger", (e as Error).message);
      setBuilding(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {result.notes.map((n, i) => <Notice key={i} tone="info">{n}</Notice>)}

      <section>
        <SectionTitle letter="A" title="Recommended offers" sub="Packaged solutions from the Opportunity Board, ranked by audit findings, goals and fit." />
        {result.offers.length === 0 ? (
          <Empty title="No packaged offer qualifies yet" body="Assess more audit items, or tap a buyer quote the client recognised on the Business step. You can still add any offer below." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {result.offers.map((o) => <OfferCard key={o.key} o={o} decision={decisions[o.key] ?? "pending"} onDecide={(d) => set(o.key, d)} />)}
          </div>
        )}
        {result.otherOffers.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setShowOther(!showOther)} className="text-[14px] font-medium text-ink-2 hover:text-ink">
              {showOther ? "Hide" : "Show"} {result.otherOffers.length} other matching offer{result.otherOffers.length > 1 ? "s" : ""} (weaker evidence)
            </button>
            {showOther && (
              <div className="mt-3 grid gap-4 xl:grid-cols-2">
                {result.otherOffers.map((o) => <OfferCard key={o.key} o={o} decision={decisions[o.key] ?? "pending"} onDecide={(d) => set(o.key, d)} />)}
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <SectionTitle letter="B" title="Supporting services & add-ons" sub="Gaps the offers above don't cover, plus dependencies the plan needs." />
        {result.supporting.length === 0 ? (
          <p className="text-[14px] text-ink-3">Nothing extra needed for the gaps found.</p>
        ) : (
          <Card className="divide-y divide-border">
            {result.supporting.map((x) => <ServiceRow key={x.key} x={x} decision={decisions[x.key] ?? "pending"} onDecide={(d) => set(x.key, d)} />)}
          </Card>
        )}
      </section>

      <section>
        <SectionTitle letter="C" title="Already in place / not needed now" sub="Don't sell what already works." />
        {result.inPlace.length === 0 ? (
          <p className="text-[14px] text-ink-3">Nothing marked as working well or not applicable yet.</p>
        ) : (
          <Card className="divide-y divide-border">
            {result.inPlace.map((x) => (
              <div key={x.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-medium">{x.name} <Badge tone={x.reason === "in_place" ? "ok" : "neutral"}>{x.reason === "in_place" ? "In place" : "Not needed"}</Badge></p>
                  <p className="text-[13px] text-ink-3">{x.evidence.map((e) => e.label).join(" · ")}</p>
                </div>
                <Button size="sm" variant={decisions[x.key] === "accepted" ? "primary" : "secondary"} onClick={() => set(x.key, decisions[x.key] === "accepted" ? "removed" : "accepted")}>
                  {decisions[x.key] === "accepted" ? "Added anyway ✓" : "Add anyway"}
                </Button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionTitle letter="+" title="Add from the catalogue" sub="Any offer or service from the five links." />
        <AddFromCatalogue ref_={ref_} onAdd={(key) => set(key, "accepted")} />
        {added.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {added.map(([k]) => {
              const [kind, id] = k.split(":");
              const name = kind === "offer" ? ref_.offers.find((o) => o.id === id)?.name : ref_.services.find((s) => s.id === id)?.name;
              return (
                <Badge key={k} tone="dark" className="py-1 pl-3 pr-1">
                  {name ?? id}
                  <button aria-label={`Remove ${name}`} onClick={() => set(k, "removed")} className="ml-1 rounded-full px-1.5 hover:bg-white/20">×</button>
                </Badge>
              );
            })}
          </div>
        )}
      </section>

      <div className="no-print fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur lg:sticky lg:bottom-4 lg:rounded-[14px] lg:border lg:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] text-ink-2"><span className="num font-semibold text-ink">{acceptedCount}</span> item{acceptedCount === 1 ? "" : "s"} selected</p>
          <Button size="lg" onClick={build} loading={building} disabled={acceptedCount === 0}>Build quotation →</Button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ letter, title, sub }: { letter: string; title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-ink text-[13px] font-semibold text-white">{letter}</span>
      <div>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="text-[14px] text-ink-2">{sub}</p>
      </div>
    </div>
  );
}

function DecisionButtons({ decision, onDecide }: { decision: Decision; onDecide: (d: Decision) => void }) {
  const opts: { v: Decision; label: string }[] = [
    { v: "accepted", label: "Include" },
    { v: "deferred", label: "Later" },
    { v: "removed", label: "Remove" },
  ];
  return (
    <div className="flex gap-1 rounded-[10px] bg-surface-2 p-1" role="radiogroup" aria-label="Decision">
      {opts.map((o) => (
        <button key={o.v} role="radio" aria-checked={decision === o.v} onClick={() => onDecide(o.v)}
          className={cx("min-h-[34px] rounded-[8px] px-3 text-[13px] font-medium", decision === o.v ? (o.v === "accepted" ? "bg-ink text-white" : "bg-surface shadow-sm") : "text-ink-2")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OfferCard({ o, decision, onDecide }: { o: OfferRecommendation; decision: Decision; onDecide: (d: Decision) => void }) {
  const p = o.pricing;
  const inPlace = new Set(o.componentsInPlace.map((c) => c.label));
  return (
    <Card className={cx("flex flex-col p-5", decision === "removed" && "opacity-55")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap gap-1.5">
            <Badge tone={o.priority === "high" ? "danger" : o.priority === "medium" ? "warn" : "neutral"}>{o.priority} priority</Badge>
            {o.quoteMatched && <Badge tone="accent">Client said it</Badge>}
            {o.industryFit === "suggested" && <Badge tone="info">Industry fit</Badge>}
            {o.industryFit === "any" && <Badge>Any industry</Badge>}
          </div>
          <h3 className="text-[18px] font-semibold">{o.name}</h3>
        </div>
        <span className="num shrink-0 text-[12px] text-ink-3">score {o.score}</span>
      </div>

      {o.problems.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow mb-1.5">Observed problem</p>
          <ul className="flex flex-col gap-1 text-[14px]">
            {o.problems.slice(0, 4).map((pr) => (
              <li key={pr.itemId} className="flex items-start gap-2">
                <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", pr.status === "missing" ? "bg-danger" : "bg-warn")} />
                <span>{pr.label} <span className="text-ink-3">— {statusLabel(pr.status).toLowerCase()}{pr.confirmedByClient ? ", client confirmed" : ""}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3">
        <p className="eyebrow mb-1">Why this</p>
        <p className="text-[14px] text-ink-2">{o.why}</p>
      </div>
      <div className="mt-3">
        <p className="eyebrow mb-1">Expected outcome</p>
        <p className="text-[14px]">{o.outcome}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {o.components.map(({ label: c }) => (
          <span key={c} className={cx("rounded-full border px-2.5 py-0.5 text-[12px]", inPlace.has(c) ? "border-ok/30 bg-ok-soft text-ok line-through" : "border-border bg-surface-2")}>{c}</span>
        ))}
      </div>
      {(o.dependencies.length > 0 || o.missingInfo.length > 0 || o.budgetNote || inPlace.size > 0) && (
        <ul className="mt-3 flex flex-col gap-1 text-[13px] text-warn">
          {inPlace.size > 0 && <li>Already in place: {[...inPlace].join(", ")} — reduce scope or keep and explain.</li>}
          {o.budgetNote && <li>{o.budgetNote}</li>}
          {o.dependencies.map((d) => <li key={d}>{d}</li>)}
          {o.missingInfo.slice(0, 3).map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
        <div className="num flex gap-5 text-[14px]">
          <div><p className="eyebrow">{p.upfrontKind === "project" ? "Project" : "Setup"}</p><p className="font-semibold">{p.upfrontIncluded ? "Included" : p.upfrontMin != null ? formatBand(p.upfrontMin, p.upfrontMax ?? p.upfrontMin) : "—"}</p></div>
          <div><p className="eyebrow">Monthly{p.monthlyTermMonths ? ` × ${p.monthlyTermMonths}` : ""}</p><p className="font-semibold">{p.monthlyMin != null ? formatBand(p.monthlyMin, p.monthlyMax ?? p.monthlyMin) : "—"}</p></div>
        </div>
        <DecisionButtons decision={decision} onDecide={onDecide} />
      </div>
    </Card>
  );
}

function ServiceRow({ x, decision, onDecide }: { x: ServiceRecommendation; decision: Decision; onDecide: (d: Decision) => void }) {
  return (
    <div className={cx("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between", decision === "removed" && "opacity-55")}>
      <div className="min-w-0">
        <p className="font-medium">
          {x.name} {x.kind === "dependency" ? <Badge tone="info">Dependency</Badge> : <Badge tone={x.priority === "high" ? "danger" : "neutral"}>{x.priority}</Badge>}
        </p>
        <p className="text-[13px] text-ink-2">{x.reason}</p>
      </div>
      <DecisionButtons decision={decision} onDecide={onDecide} />
    </div>
  );
}

function AddFromCatalogue({ ref_, onAdd }: { ref_: Ref; onAdd: (key: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <Select aria-label="Add offer or service" value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Choose an offer or service…</option>
        <optgroup label="Packaged offers">
          {ref_.offers.map((o) => <option key={o.id} value={`offer:${o.id}`}>{o.number}. {o.name}</option>)}
        </optgroup>
        {ref_.links.map((l) => (
          <optgroup key={l.id} label={l.name}>
            {ref_.services.filter((s) => s.linkId === l.id).map((s) => <option key={s.id} value={`service:${s.id}`}>{s.name}</option>)}
          </optgroup>
        ))}
      </Select>
      <Button variant="secondary" disabled={!value} onClick={() => { onAdd(value); setValue(""); }}>Add</Button>
    </div>
  );
}
