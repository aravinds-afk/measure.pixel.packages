import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { formatINR } from "@/lib/money";
import type { QuoteDoc } from "@/lib/quote-schema";
import { SearchBar } from "@/components/search-bar";
import { Badge, Empty, LinkButton, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/server/auth";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { effectiveStatus } from "@/server/services/quotes";

export const metadata = { title: "Quotations" };

const TONE = { draft: "neutral", presented: "info", sent: "info", accepted: "ok", rejected: "danger", expired: "warn" } as const;

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requirePageUser();
  const { q = "", status = "" } = await searchParams;
  const db = getDb();
  const rows = await db
    .select({ quote: s.quotes, clientName: s.clients.businessName })
    .from(s.quotes)
    .innerJoin(s.clients, eq(s.clients.id, s.quotes.clientId))
    .orderBy(desc(s.quotes.updatedAt))
    .limit(500);
  // One row per quotation: its latest version.
  const latest = new Map<string, (typeof rows)[number] & { versions: number }>();
  for (const r of rows) {
    const cur = latest.get(r.quote.rootId);
    if (!cur) latest.set(r.quote.rootId, { ...r, versions: 1 });
    else {
      cur.versions++;
      if (r.quote.version > cur.quote.version) latest.set(r.quote.rootId, { ...r, versions: cur.versions });
    }
  }
  const term = q.trim().toLowerCase();
  const list = [...latest.values()]
    .map((r) => ({ ...r, status: effectiveStatus(r.quote) }))
    .filter((r) => (!status || r.status === status) && (!term || `${r.clientName} ${r.quote.number} ${(r.quote.doc as QuoteDoc).items.map((i) => i.name).join(" ")}`.toLowerCase().includes(term)));

  return (
    <div>
      <PageHeader eyebrow="Quotations" title="Quotations" subtitle="Latest version of each quotation. Earlier versions are kept on the quotation page." actions={<LinkButton href="/audits/new">New audit</LinkButton>} />
      <Suspense>
        <SearchBar placeholder="Search client, number or service" filter={{ name: "status", label: "Status", options: [{ value: "", label: "All statuses" }, ...["draft", "presented", "sent", "accepted", "rejected", "expired"].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))] }} />
      </Suspense>
      {list.length === 0 ? (
        <Empty title="No quotations found" body="Quotations are created from an audit's recommendations or from a client profile." />
      ) : (
        <ul className="card divide-y divide-border">
          {list.map(({ quote: x, clientName, status: st, versions }) => (
            <li key={x.id}>
              <Link href={`/quotes/${x.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{clientName}</p>
                  <p className="num text-[13px] text-ink-3">{x.number} · v{x.version}{versions > 1 ? ` (${versions} versions)` : ""} · {new Date(x.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="num text-right text-[14px]">
                    <p>{formatINR(x.oneTimeTotal)} <span className="text-ink-3">one-time</span></p>
                    <p>{formatINR(x.monthlyTotal)} <span className="text-ink-3">/mo</span></p>
                  </div>
                  <Badge tone={TONE[st]}>{st}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
