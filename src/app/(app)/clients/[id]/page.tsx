import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { formatINR } from "@/lib/money";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/server/auth";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { effectiveStatus } from "@/server/services/quotes";
import { ClientEditor, NewQuoteButton, PaymentForm } from "./client-actions";

export const metadata = { title: "Client" };

const TONE = { draft: "neutral", presented: "info", sent: "info", accepted: "ok", rejected: "danger", expired: "warn" } as const;

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const { id } = await params;
  const db = getDb();
  const [c] = await db.select().from(s.clients).where(eq(s.clients.id, id));
  if (!c) notFound();
  const [audits, quotes, payments, industries, offers] = await Promise.all([
    db.select().from(s.audits).where(eq(s.audits.clientId, id)).orderBy(desc(s.audits.createdAt)),
    db.select().from(s.quotes).where(eq(s.quotes.clientId, id)).orderBy(desc(s.quotes.createdAt)),
    db.select().from(s.payments).where(eq(s.payments.clientId, id)).orderBy(desc(s.payments.receivedOn)),
    db.select().from(s.industries),
    db.select().from(s.offers),
  ]);
  const recs = audits.length ? await db.select().from(s.recommendations).where(eq(s.recommendations.auditId, audits[0].id)) : [];
  const roots = [...new Set(quotes.map((q) => q.rootId))];
  const industry = industries.find((i) => i.id === c.industryId);

  return (
    <div>
      <PageHeader
        eyebrow={industry?.name ?? "Client"}
        title={c.businessName}
        subtitle={[c.website, c.contactPerson, c.phone, c.email].filter(Boolean).join(" · ")}
        actions={
          <>
            <LinkButton href={`/audits/new?clientId=${c.id}`} variant="secondary">New audit</LinkButton>
            <NewQuoteButton clientId={c.id} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section>
            <p className="eyebrow mb-3">Quotations</p>
            {roots.length === 0 ? (
              <p className="text-[14px] text-ink-3">No quotations yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {roots.map((root) => {
                  const versions = quotes.filter((q) => q.rootId === root).sort((a, b) => b.version - a.version);
                  return (
                    <Card key={root} className="p-4">
                      <p className="num mb-2 text-[13px] text-ink-3">{versions[0].number}</p>
                      <ul className="flex flex-col gap-1.5">
                        {versions.map((q) => {
                          const st = effectiveStatus(q);
                          return (
                            <li key={q.id}>
                              <Link href={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 hover:bg-surface-2">
                                <span className="text-[14px] font-medium">v{q.version} <Badge tone={TONE[st]}>{st}</Badge></span>
                                <span className="num text-[13px] text-ink-2">{formatINR(q.oneTimeTotal)} + {formatINR(q.monthlyTotal)}/mo</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <p className="eyebrow mb-3">Audits</p>
            {audits.length === 0 ? (
              <p className="text-[14px] text-ink-3">No audits yet.</p>
            ) : (
              <ul className="card divide-y divide-border">
                {audits.map((a) => {
                  const done = Object.values(a.responses).filter((r) => r.status !== "not_assessed").length;
                  return (
                    <li key={a.id}>
                      <Link href={`/audits/${a.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2">
                        <span className="text-[14px] font-medium">{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} <Badge tone={a.status === "completed" ? "ok" : "neutral"}>{a.status}</Badge></span>
                        <span className="text-[13px] text-ink-3">{done} items assessed →</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {recs.filter((r) => r.offerId && r.decision === "accepted").length > 0 && (
              <p className="mt-3 text-[14px] text-ink-2">
                Latest recommended offers: {recs.filter((r) => r.offerId && r.decision === "accepted").map((r) => offers.find((o) => o.id === r.offerId)?.name).join(", ")}
              </p>
            )}
          </section>

          <section>
            <p className="eyebrow mb-3">Cash collected</p>
            <Card className="p-4">
              {payments.length > 0 && (
                <ul className="mb-4 flex flex-col gap-1 text-[14px]">
                  {payments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3"><span>{p.receivedOn} {p.note && <span className="text-ink-3">· {p.note}</span>}</span><span className="num">{formatINR(p.amount)}</span></li>
                  ))}
                </ul>
              )}
              <PaymentForm clientId={c.id} quotes={roots.map((r) => ({ id: quotes.find((q) => q.rootId === r)!.id, label: quotes.find((q) => q.rootId === r)!.number }))} />
            </Card>
          </section>
        </div>
        <aside>
          <ClientEditor client={{ id: c.id, businessName: c.businessName, website: c.website, contactPerson: c.contactPerson, phone: c.phone, email: c.email, notes: c.notes, nextFollowUp: c.nextFollowUp, industryId: c.industryId, lastContactAt: c.lastContactAt }} industries={industries.map((i) => ({ id: i.id, name: i.name }))} />
        </aside>
      </div>
    </div>
  );
}
