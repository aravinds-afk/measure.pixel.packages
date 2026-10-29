import Link from "next/link";
import { Suspense } from "react";
import { CASH_TIER } from "@/data/opportunity-board";
import { formatBand, formatINR } from "@/lib/money";
import { SearchBar } from "@/components/search-bar";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/server/auth";
import { loadCatalogRows } from "@/server/catalog";

export const metadata = { title: "Opportunities" };

export default async function CataloguePage({ searchParams }: { searchParams: Promise<{ q?: string; industry?: string }> }) {
  const user = await requirePageUser();
  const { q = "", industry = "" } = await searchParams;
  const rows = await loadCatalogRows();
  const term = q.trim().toLowerCase();
  const ind = rows.industries.find((i) => i.id === industry);
  const offers = rows.offers.filter((o) => o.active && (!ind || o.clusterId === null || o.clusterId === ind.clusterId) && (!term || `${o.name} ${o.buyerQuote} ${o.components.map((c) => c.label).join(" ")}`.toLowerCase().includes(term)));
  const services = rows.services.filter((s) => s.active && (!industry || s.industryIds.length === 0 || s.industryIds.includes(industry)) && (!term || s.name.toLowerCase().includes(term)));

  return (
    <div>
      <PageHeader eyebrow="Opportunity Board" title="Opportunities" subtitle={`${rows.services.filter((s) => s.active).length} services in five links · ${rows.industries.filter((i) => i.active).length} industries · ${rows.offers.filter((o) => o.active).length} packaged offers. Price bands are planning figures, set per client after discovery.`}
        actions={user.role === "admin" ? <Link href="/settings/catalogue" className="text-[14px] font-medium underline underline-offset-4">Edit catalogue</Link> : undefined} />
      <Suspense>
        <SearchBar placeholder="Search offers and services" filter={{ name: "industry", label: "Industry", options: [{ value: "", label: "All industries" }, ...rows.industries.map((i) => ({ value: i.id, label: i.name }))] }} />
      </Suspense>

      <Card className="mb-8 p-5">
        <p className="eyebrow mb-1">{CASH_TIER.heading}</p>
        <p className="text-[14px] text-ink-2">{CASH_TIER.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{CASH_TIER.segments.map((x) => <Badge key={x} tone="accent">{x}</Badge>)}</div>
      </Card>

      <section className="mb-10">
        <p className="eyebrow mb-3">Packaged offers</p>
        <div className="grid gap-3 md:grid-cols-2">
          {offers.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="num text-[12px] text-ink-3">{String(o.number).padStart(2, "0")} · {o.audienceLabel.toUpperCase()}</p>
                  <h2 className="text-[17px] font-semibold">{o.name}</h2>
                </div>
                <div className="num text-right text-[13px]">
                  <p><span className="text-ink-3">{o.upfrontKind === "project" ? "Project" : "Setup"} </span>{o.upfrontIncluded ? "Included" : o.upfrontMin != null ? formatBand(o.upfrontMin, o.upfrontMax ?? o.upfrontMin) : "—"}</p>
                  <p><span className="text-ink-3">Monthly{o.monthlyTermMonths ? ` × ${o.monthlyTermMonths}` : ""} </span>{o.monthlyMin != null ? formatBand(o.monthlyMin, o.monthlyMax ?? o.monthlyMin) : "—"}</p>
                </div>
              </div>
              <p className="mt-2 text-[14px] italic text-ink-2">“{o.buyerQuote}”</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {o.components.map((c) => <span key={c.label} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px]">{c.label}{c.basis === "unmapped" ? " ⚠" : ""}</span>)}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="eyebrow mb-3">Services by link</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.links.map((l) => {
            const list = services.filter((s) => s.linkId === l.id);
            return (
              <Card key={l.id} className="p-5">
                <div className="mb-3 flex items-baseline justify-between"><h2 className="text-[16px] font-semibold">{l.name}</h2><span className="num text-[13px] text-ink-3">{list.length}</span></div>
                {l.note && <p className="mb-3 text-[12px] text-ink-3">{l.note}</p>}
                <ul className="flex flex-col gap-1.5 text-[14px]">
                  {list.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span>{s.name}</span>
                      <span className="num shrink-0 text-[12px] text-ink-3">
                        {s.priceOptions[0] ? (s.priceOptions[0].unitPrice ? `${formatINR(s.priceOptions[0].unitPrice)}/${s.priceOptions[0].unitLabel}` : s.priceOptions[0].monthlyFee ? `${formatINR(s.priceOptions[0].monthlyFee)}/mo` : "") : "price not set"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <p className="eyebrow mb-3">Industries by cluster</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {rows.clusters.map((c) => {
            const list = rows.industries.filter((i) => i.clusterId === c.id && i.active);
            return (
              <Card key={c.id} className="p-4">
                <div className="mb-2 flex items-baseline justify-between"><h2 className="text-[15px] font-semibold">{c.name}</h2><span className="num text-[13px] text-ink-3">{list.length}</span></div>
                <ul className="text-[13px] leading-6 text-ink-2">{list.map((i) => <li key={i.id}>{i.name}</li>)}</ul>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
