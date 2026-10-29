import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { formatINR } from "@/lib/money";
import { Badge, buttonClass, Card, Notice, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/server/auth";
import { loadCatalogRows } from "@/server/catalog";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import type { DiscoveryResult } from "@/server/discovery/analyze";
import type { InstagramResult } from "@/server/discovery/instagram";

export const metadata = { title: "Prescription" };

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "neutral" }> = {
  working_well: { label: "Working well", tone: "ok" },
  needs_improvement: { label: "Needs improvement", tone: "warn" },
  missing: { label: "Missing", tone: "danger" },
  not_applicable: { label: "Not applicable", tone: "neutral" },
};

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const { id } = await params;
  const db = getDb();
  const [audit] = await db.select().from(s.audits).where(eq(s.audits.id, id));
  if (!audit) notFound();
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, audit.clientId));
  const [rows, recs, [quote]] = await Promise.all([
    loadCatalogRows(db),
    db.select().from(s.recommendations).where(eq(s.recommendations.auditId, id)),
    db.select().from(s.quotes).where(eq(s.quotes.idempotencyKey, `auto-${id}`)),
  ]);
  const d = audit.discovery as (DiscoveryResult & { instagram?: InstagramResult | null }) | null;
  const ig = d?.instagram;
  const industry = rows.industries.find((i) => i.id === audit.industryId);
  const offers = recs.filter((r) => r.group === "offer" && r.decision === "accepted");
  const support = recs.filter((r) => r.group === "supporting" && r.decision === "accepted");
  const inPlace = recs.filter((r) => r.group === "in_place");
  const items = rows.auditItems.filter((i) => i.active);
  const assessed = items.filter((i) => audit.responses[i.id] && audit.responses[i.id].status !== "not_assessed");
  const gaps = assessed.filter((i) => ["missing", "needs_improvement"].includes(audit.responses[i.id].status));
  const ask = items.filter((i) => i.priority === "high" && !(audit.responses[i.id] && audit.responses[i.id].status !== "not_assessed"));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Automatic audit · prescription"
        title={client.businessName}
        subtitle={[industry ? `${industry.name} (detected — change it on the audit if wrong)` : "Industry not detected — set it on the audit", client.website, ig?.status === "ok" ? `@${ig.handle}` : ""].filter(Boolean).join(" · ")}
        actions={
          <>
            {quote && <Link href={`/quotes/${quote.id}`} className={buttonClass("primary")}>Open draft quotation</Link>}
            <Link href={`/audits/${id}?step=audit`} className={buttonClass("secondary")}>Review audit</Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Pages read" value={String(d?.pages.filter((p) => p.ok).length ?? 0)} note={d?.error ?? (d?.robots ? `robots.txt: ${d.robots}` : undefined)} />
        <Stat label="Instagram" value={ig?.status === "ok" ? `${ig.postsLast30} posts / 30d` : ig ? "Not read" : "Not given"} note={ig?.status === "ok" ? `${ig.followers?.toLocaleString("en-IN") ?? "?"} followers${ig.avgEngagementRate != null ? ` · ${(ig.avgEngagementRate * 100).toFixed(2)}% engagement` : ""}` : ig && "message" in ig ? ig.message : undefined} />
        <Stat label="Findings" value={`${assessed.length} of ${items.length}`} note={`${gaps.length} gaps · ${assessed.filter((i) => audit.responses[i.id].source === "auto-inferred").length} inferred`} />
        <Stat label="Draft quotation" value={quote ? `${formatINR(quote.oneTimeTotal)} + ${formatINR(quote.monthlyTotal)}/mo` : "None"} note={quote ? "Board band minimums, incl. GST. Adjust before sending." : "No offer qualified on public evidence alone"} />
      </div>

      {d?.error && !d.pages.some((p) => p.ok) && <Notice tone="warn" title="Website not inspected">{d.error}. Findings below come only from the other sources.</Notice>}

      <section className="flex flex-col gap-3">
        <h2 className="text-[20px] font-semibold">Prescription</h2>
        {offers.length === 0 && support.length === 0 && (
          <Notice tone="info">Public evidence was not enough to prescribe a packaged offer. Ask the questions below, mark the answers on the audit, and recommendations will update.</Notice>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {offers.map((r) => {
            const o = rows.offers.find((x) => x.id === r.offerId);
            const rule = rows.rules.find((x) => x.offerId === r.offerId);
            return (
              <Card key={r.id} className="p-5">
                <div className="mb-1 flex flex-wrap gap-1.5"><Badge tone="dark">Packaged offer</Badge><Badge tone={r.priority === "high" ? "danger" : "warn"}>{r.priority} priority</Badge></div>
                <h3 className="text-[18px] font-semibold">{o?.name}</h3>
                <p className="mt-2 text-[14px] text-ink-2">{r.reason}</p>
                {rule && <p className="mt-2 text-[14px]"><span className="text-ink-3">Outcome: </span>{rule.outcome}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">{o?.components.map((c) => <span key={c.label} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px]">{c.label}</span>)}</div>
                <p className="num mt-3 text-[14px] font-semibold">{r.recommendedPrice}</p>
              </Card>
            );
          })}
        </div>
        {support.length > 0 && (
          <Card className="divide-y divide-border">
            {support.map((r) => (
              <div key={r.id} className="flex flex-col gap-0.5 px-5 py-3">
                <p className="font-medium">{rows.services.find((x) => x.id === r.serviceId)?.name} <Badge>{r.reason.startsWith("Dependency") ? "Dependency" : "Supporting"}</Badge></p>
                <p className="text-[13px] text-ink-2">{r.reason}</p>
              </div>
            ))}
          </Card>
        )}
        {inPlace.length > 0 && <p className="text-[14px] text-ink-2"><span className="font-medium text-ink">Don&apos;t sell:</span> {inPlace.map((r) => rows.services.find((x) => x.id === r.serviceId)?.name).join(" · ")} — already in place or not needed.</p>}
      </section>

      {ask.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] font-semibold">Ask the client</h2>
          <p className="text-[14px] text-ink-2">High-priority items a public website can&apos;t show. Their answers can change the prescription.</p>
          <Card className="divide-y divide-border">
            {ask.map((i) => <p key={i.id} className="px-5 py-3 text-[14px]">{i.label}?</p>)}
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[20px] font-semibold">What we found</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.categories.map((c) => {
            const list = assessed.filter((i) => i.categoryId === c.id);
            if (!list.length) return null;
            return (
              <Card key={c.id} className="p-5">
                <p className="mb-2 font-semibold">{c.name}</p>
                <ul className="flex flex-col gap-2 text-[14px]">
                  {list.map((i) => {
                    const r = audit.responses[i.id];
                    return (
                      <li key={i.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>{i.label}</span>
                          <span className="flex gap-1"><Badge tone={STATUS[r.status]?.tone ?? "neutral"}>{STATUS[r.status]?.label ?? r.status}</Badge><Badge tone={r.source === "auto-inferred" ? "info" : "neutral"}>{r.source === "auto-inferred" ? "Inferred" : r.source === "auto-verified" ? "Verified" : "Consultant"}</Badge></span>
                        </div>
                        {r.evidence && <p className="mt-0.5 break-words text-[12px] text-ink-3">{r.evidence}</p>}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
        {d?.observations && (
          <details className="card p-5 text-[14px]">
            <summary className="font-medium">All observations ({d.observations.length})</summary>
            <ul className="mt-3 flex flex-col gap-1.5">
              {d.observations.map((o, k) => (
                <li key={k} className="flex gap-2"><Badge tone={o.kind === "verified" ? "ok" : o.kind === "inference" ? "warn" : "neutral"}>{o.kind}</Badge><span className="min-w-0 break-words">{o.text}</span></li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="num mt-1 text-[17px] font-semibold">{value}</p>
      {note && <p className="mt-0.5 text-[12px] text-ink-3">{note}</p>}
    </Card>
  );
}
