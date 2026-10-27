"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatBand, formatINR } from "@/lib/money";
import type { OfferLike, PriceOptionLike } from "@/lib/lines";
import { Badge, Button, cx, Input, Select } from "@/components/ui";

export type DrawerOffer = OfferLike & { number: number; clusterId: string | null; audienceLabel: string; buyerQuote: string };
export type DrawerService = { id: string; name: string; linkId: string; industryIds: string[]; priceOptions: PriceOptionLike[] };

/** Searchable catalogue: all 14 offers and 32 services, filterable by link and industry. */
export function CatalogueDrawer({
  open,
  onClose,
  offers,
  services,
  links,
  industries,
  clusters,
  inCart,
  onAddOffer,
  onAddService,
  onAddCustom,
}: {
  open: boolean;
  onClose: () => void;
  offers: DrawerOffer[];
  services: DrawerService[];
  links: { id: string; name: string }[];
  industries: { id: string; name: string; clusterId: string }[];
  clusters: { id: string; name: string }[];
  inCart: Set<string>;
  onAddOffer: (o: DrawerOffer) => void;
  onAddService: (s: DrawerService, optionId?: string | null) => void;
  onAddCustom: () => void;
}) {
  const [q, setQ] = useState("");
  const [link, setLink] = useState<string>("offers");
  const [industryId, setIndustryId] = useState("");
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => search.current?.focus(), 50);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  const industry = industries.find((i) => i.id === industryId);
  const term = q.trim().toLowerCase();
  const offerList = useMemo(
    () =>
      offers.filter(
        (o) =>
          (!industry || o.clusterId === null || o.clusterId === industry.clusterId) &&
          (!term || `${o.name} ${o.buyerQuote} ${o.components.map((c) => c.label).join(" ")}`.toLowerCase().includes(term)),
      ),
    [offers, industry, term],
  );
  const serviceList = useMemo(
    () =>
      services.filter(
        (s) =>
          (link === "all" || link === "offers" ? true : s.linkId === link) &&
          (!industryId || s.industryIds.length === 0 || s.industryIds.includes(industryId)) &&
          (!term || s.name.toLowerCase().includes(term)),
      ),
    [services, link, industryId, term],
  );
  const showOffers = link === "offers" || link === "all" || !!term;
  const showServices = link !== "offers" || !!term;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Add services">
      <button aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[560px] flex-col bg-bg shadow-2xl">
        <div className="border-b border-border bg-surface px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Add to quotation</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
          </div>
          <Input ref={search} type="search" placeholder="Search offers and services" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[{ id: "offers", name: "Packaged offers" }, { id: "all", name: "All" }, ...links].map((l) => (
              <button key={l.id} onClick={() => setLink(l.id)} aria-pressed={link === l.id}
                className={cx("min-h-[34px] shrink-0 rounded-full border px-3 text-[13px] font-medium", link === l.id ? "border-ink bg-ink text-white" : "border-border bg-surface text-ink-2")}>
                {l.name}
              </button>
            ))}
          </div>
          <Select aria-label="Filter by industry" className="mt-2" value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
            <option value="">All industries</option>
            {clusters.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {industries.filter((i) => i.clusterId === c.id).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {showOffers && (
            <section className="mb-6">
              <p className="eyebrow mb-2">Packaged offers</p>
              <ul className="flex flex-col gap-2">
                {offerList.map((o) => (
                  <li key={o.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{o.number}. {o.name}</p>
                        <p className="text-[12px] uppercase tracking-wide text-ink-3">{o.audienceLabel}</p>
                        <p className="mt-1 text-[13px] italic text-ink-2">“{o.buyerQuote}”</p>
                        <p className="num mt-2 text-[13px]">
                          {o.upfrontKind === "project" ? "Project" : "Setup"} {o.upfrontIncluded ? "included" : o.upfrontMin != null ? formatBand(o.upfrontMin, o.upfrontMax ?? o.upfrontMin) : "—"}
                          {" · "}Monthly{o.monthlyTermMonths ? ` × ${o.monthlyTermMonths}` : ""} {o.monthlyMin != null ? formatBand(o.monthlyMin, o.monthlyMax ?? o.monthlyMin) : "—"}
                        </p>
                      </div>
                      <Button size="sm" variant={inCart.has(`offer:${o.id}`) ? "secondary" : "primary"} onClick={() => onAddOffer(o)}>
                        {inCart.has(`offer:${o.id}`) ? "Add again" : "Add"}
                      </Button>
                    </div>
                  </li>
                ))}
                {offerList.length === 0 && <li className="text-[14px] text-ink-3">No offers match.</li>}
              </ul>
            </section>
          )}
          {showServices && (
            <section>
              <p className="eyebrow mb-2">Services</p>
              <ul className="card divide-y divide-border">
                {serviceList.map((s) => (
                  <li key={s.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-[12px] text-ink-3">
                          {links.find((l) => l.id === s.linkId)?.name}
                          {s.priceOptions.length === 0 && <> · <Badge tone="warn" className="ml-1">Price not configured</Badge></>}
                        </p>
                      </div>
                      {s.priceOptions.length === 0 && <Button size="sm" variant={inCart.has(`service:${s.id}`) ? "secondary" : "primary"} onClick={() => onAddService(s, null)}>Add</Button>}
                    </div>
                    {s.priceOptions.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {s.priceOptions.map((o) => (
                          <button key={o.id} onClick={() => onAddService(s, o.id)} className="flex min-h-[40px] items-center justify-between gap-2 rounded-[10px] border border-border px-3 text-left text-[13px] hover:border-ink">
                            <span>{o.label}</span>
                            <span className="num shrink-0 font-medium">{priceLabel(o)} +</span>
                          </button>
                        ))}
                        <button onClick={() => onAddService(s, null)} className="self-start text-[13px] text-ink-2 hover:text-ink">+ Custom price</button>
                      </div>
                    )}
                  </li>
                ))}
                {serviceList.length === 0 && <li className="px-4 py-3 text-[14px] text-ink-3">No services match.</li>}
              </ul>
            </section>
          )}
          <button onClick={onAddCustom} className="mt-6 w-full rounded-[12px] border border-dashed border-border-strong py-4 text-[14px] font-medium text-ink-2 hover:border-ink hover:text-ink">
            + Custom line item
          </button>
        </div>
      </div>
    </div>
  );
}

function priceLabel(o: PriceOptionLike) {
  if (o.model === "per_unit") return `${formatINR(o.unitPrice ?? 0)}/${o.unitLabel || "unit"}`;
  if (o.model === "monthly") return `${formatINR(o.monthlyFee ?? 0)}/mo`;
  if (o.model === "annual") return `${formatINR(o.annualFee ?? 0)}/yr`;
  if (o.model === "setup_plus_monthly") return `${formatINR(o.setupFee ?? 0)} + ${formatINR(o.monthlyFee ?? 0)}/mo`;
  return formatINR(o.unitPrice ?? 0);
}
