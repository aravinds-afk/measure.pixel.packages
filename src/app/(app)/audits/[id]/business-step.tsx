"use client";

import { useState } from "react";
import { Badge, Button, Card, cx, Field, Input, Notice, Segmented, Select, Spinner, Textarea } from "@/components/ui";
import type { AuditState, ClientState, Ref } from "./types";

export function BusinessStep({
  audit,
  client,
  ref_,
  discovering,
  onDiscover,
  updateAudit,
  updateClient,
  onNext,
}: {
  audit: AuditState;
  client: ClientState;
  ref_: Ref;
  discovering: boolean;
  onDiscover: () => void;
  updateAudit: (p: Partial<AuditState>) => void;
  updateClient: (p: Partial<ClientState>) => void;
  onNext: () => void;
}) {
  const d = audit.discovery;
  const industry = ref_.industries.find((i) => i.id === audit.industryId);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-6">
        <Card className="p-5">
          <p className="eyebrow mb-4">Business</p>
          <div className="flex flex-col gap-4">
            <Field label="Business name" htmlFor="bn">
              <Input id="bn" value={client.businessName} onChange={(e) => updateClient({ businessName: e.target.value })} />
            </Field>
            <Field label="Industry" htmlFor="ind" hint={industry ? `Cluster: ${ref_.clusters.find((c) => c.id === industry.clusterId)?.name}` : "Pick one of the 44 board industries"}>
              <Select id="ind" value={audit.industryId ?? ""} onChange={(e) => updateAudit({ industryId: e.target.value || null })}>
                <option value="">Select industry…</option>
                {ref_.clusters.map((c) => (
                  <optgroup key={c.id} label={c.name}>
                    {ref_.industries.filter((i) => i.clusterId === c.id).map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            {d && d.industrySuggestions.length > 0 && (
              <div className="-mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-ink-3">From website (inferred):</span>
                {d.industrySuggestions.map((s) => (
                  <button key={s.industryId} type="button" onClick={() => updateAudit({ industryId: s.industryId })}
                    className={cx("rounded-full border px-3 py-1 text-[13px]", audit.industryId === s.industryId ? "border-ink bg-ink text-white" : "border-border bg-surface hover:border-ink")}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact person" htmlFor="cp"><Input id="cp" value={client.contactPerson} onChange={(e) => updateClient({ contactPerson: e.target.value })} autoComplete="name" /></Field>
              <Field label="Phone" htmlFor="ph"><Input id="ph" value={client.phone} onChange={(e) => updateClient({ phone: e.target.value })} inputMode="tel" autoComplete="tel" /></Field>
              <Field label="Email" htmlFor="em"><Input id="em" value={client.email} onChange={(e) => updateClient({ email: e.target.value })} inputMode="email" autoComplete="email" /></Field>
              <Field label="Website" htmlFor="ws"><Input id="ws" value={client.website} onChange={(e) => updateClient({ website: e.target.value })} inputMode="url" autoCapitalize="none" /></Field>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="eyebrow mb-4">Goals & pain</p>
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">What does the client want?</p>
              <div className="flex flex-wrap gap-2">
                {ref_.goals.map((g) => {
                  const on = audit.goals.includes(g.id);
                  return (
                    <button key={g.id} type="button" aria-pressed={on} onClick={() => updateAudit({ goals: on ? audit.goals.filter((x) => x !== g.id) : [...audit.goals, g.id] })}
                      className={cx("min-h-[38px] rounded-full border px-3.5 text-[14px]", on ? "border-ink bg-ink text-white" : "border-border bg-surface hover:border-ink")}>
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Goals in their words" htmlFor="gn">
              <Textarea id="gn" value={audit.goalNotes} onChange={(e) => updateAudit({ goalNotes: e.target.value })} placeholder="e.g. 40 new patients a month for the new implant specialist" />
            </Field>
            <PainQuotes audit={audit} ref_={ref_} updateAudit={updateAudit} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monthly budget (optional)" htmlFor="bud" hint="Excluding ad spend. Used only to flag offers above it.">
                <Input id="bud" inputMode="numeric" value={audit.budgetMonthly == null ? "" : String(audit.budgetMonthly / 100)} placeholder="₹"
                  onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); updateAudit({ budgetMonthly: v ? Number(v) * 100 : null }); }} />
              </Field>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-2">Readiness</span>
                <Segmented label="Readiness" value={audit.readiness ?? ("" as never)} onChange={(v) => updateAudit({ readiness: v })} size="sm"
                  options={[{ value: "now", label: "Ready now" }, { value: "next-quarter", label: "Next quarter" }, { value: "exploring", label: "Exploring" }]} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <DiscoveryPanel audit={audit} website={client.website} discovering={discovering} onDiscover={onDiscover} />
      </div>

      <div className="no-print fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur lg:static lg:col-span-2 lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0">
        <Button size="lg" className="w-full lg:w-auto" onClick={onNext}>Continue to audit →</Button>
      </div>
    </div>
  );
}

function PainQuotes({ audit, ref_, updateAudit }: { audit: AuditState; ref_: Ref; updateAudit: (p: Partial<AuditState>) => void }) {
  const industry = ref_.industries.find((i) => i.id === audit.industryId);
  const [showAll, setShowAll] = useState(false);
  const relevant = ref_.offers.filter((o) => showAll || !industry || o.clusterId === null || o.clusterId === industry.clusterId);
  return (
    <div>
      <p className="mb-1 text-[13px] font-medium text-ink-2">Does any of this sound like them?</p>
      <p className="mb-3 text-[12px] text-ink-3">What buyers say before they know they need us. Tap the ones the client recognises.</p>
      <ul className="flex flex-col gap-2">
        {relevant.map((o) => {
          const on = audit.painOfferIds.includes(o.id);
          return (
            <li key={o.id}>
              <button type="button" aria-pressed={on} onClick={() => updateAudit({ painOfferIds: on ? audit.painOfferIds.filter((x) => x !== o.id) : [...audit.painOfferIds, o.id] })}
                className={cx("w-full rounded-[12px] border px-4 py-3 text-left text-[14px] italic leading-snug", on ? "border-ink bg-accent-soft" : "border-border bg-surface hover:border-border-strong")}>
                “{o.buyerQuote}”
              </button>
            </li>
          );
        })}
      </ul>
      {industry && !showAll && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-[13px] font-medium text-ink-2 hover:text-ink">Show quotes from other industries</button>
      )}
    </div>
  );
}

function DiscoveryPanel({ audit, website, discovering, onDiscover }: { audit: AuditState; website: string; discovering: boolean; onDiscover: () => void }) {
  const d = audit.discovery;
  if (discovering)
    return (
      <Card className="flex items-start gap-3 p-5">
        <Spinner className="mt-1" />
        <div>
          <p className="font-medium">Inspecting public pages…</p>
          <p className="mt-1 text-[14px] text-ink-2">Checking robots.txt, the homepage and up to four key pages. This can take up to 30 seconds. You can keep working.</p>
        </div>
      </Card>
    );
  if (!d)
    return (
      <Card className="p-5">
        <p className="eyebrow mb-2">Website discovery</p>
        {website ? (
          <>
            <p className="text-[14px] text-ink-2">Read the public website for tags, lead capture, SEO basics and trust signals. Nothing is assumed about pages that can&apos;t be reached.</p>
            <Button className="mt-4" variant="secondary" onClick={onDiscover}>Inspect {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</Button>
          </>
        ) : (
          <p className="text-[14px] text-ink-2">No website on file. Add one on the left to inspect it, or complete the audit manually.</p>
        )}
      </Card>
    );

  const groups = [
    { kind: "verified", title: "Verified on the website", tone: "ok" as const },
    { kind: "inference", title: "Inferences — confirm with the client", tone: "warn" as const },
    { kind: "unknown", title: "Unknown — not visible publicly", tone: "neutral" as const },
  ];
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="eyebrow">Website discovery</p>
        <Button size="sm" variant="ghost" onClick={onDiscover}>Run again</Button>
      </div>
      {d.error && <div className="mb-4"><Notice tone="warn" title="Limited inspection">{d.error}</Notice></div>}
      {d.description && <p className="mb-4 text-[14px] text-ink-2">“{d.description}”</p>}
      <div className="flex flex-col gap-5">
        {groups.map((g) => {
          const list = d.observations.filter((o) => o.kind === g.kind);
          if (!list.length) return null;
          return (
            <section key={g.kind}>
              <div className="mb-2 flex items-center gap-2"><Badge tone={g.tone}>{g.title}</Badge></div>
              <ul className="flex flex-col gap-1.5 text-[14px]">
                {list.map((o, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[3px] w-[88px] shrink-0 text-[12px] text-ink-3">{o.area}</span>
                    <span className="min-w-0 break-words">
                      {o.text}
                      {o.evidenceUrl && <> <a href={o.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-ink-3 underline underline-offset-2">source</a></>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {d.manualChecks.some((m) => m.url) && (
          <section>
            <div className="mb-2"><Badge tone="info">Inspect manually</Badge></div>
            <ul className="flex flex-col gap-2 text-[14px]">
              {d.manualChecks.filter((m) => m.url).map((m, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <a href={m.url!} target="_blank" rel="noopener noreferrer nofollow" className="font-medium underline underline-offset-2">{m.platform}: {m.url}</a>
                  <span className="text-[12px] text-ink-3">{m.note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <details className="text-[13px] text-ink-2">
          <summary className="font-medium">Pages checked ({d.pages.length}) · robots.txt: {d.robots}</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {d.pages.map((p, i) => (
              <li key={i} className="break-all">{p.ok ? "✓" : "✕"} {p.url} {p.note && <span className="text-ink-3">— {p.note}</span>}</li>
            ))}
          </ul>
          <p className="mt-2 text-ink-3">Inspected {new Date(d.fetchedAt).toLocaleString("en-IN")}</p>
        </details>
      </div>
    </Card>
  );
}
