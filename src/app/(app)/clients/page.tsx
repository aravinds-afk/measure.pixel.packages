import Link from "next/link";
import { desc } from "drizzle-orm";
import { Suspense } from "react";
import { SearchBar } from "@/components/search-bar";
import { Empty, LinkButton, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/server/auth";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; industry?: string }> }) {
  await requirePageUser();
  const { q = "", industry = "" } = await searchParams;
  const db = getDb();
  const [clients, industries, quotes] = await Promise.all([
    db.select().from(s.clients).orderBy(desc(s.clients.updatedAt)).limit(1000),
    db.select().from(s.industries),
    db.select({ clientId: s.quotes.clientId, status: s.quotes.status }).from(s.quotes),
  ]);
  const indName = new Map(industries.map((i) => [i.id, i.name]));
  const term = q.trim().toLowerCase();
  const list = clients.filter(
    (c) => (!industry || c.industryId === industry) && (!term || `${c.businessName} ${c.website} ${c.contactPerson} ${c.email} ${c.phone}`.toLowerCase().includes(term)),
  );
  return (
    <div>
      <PageHeader eyebrow="Clients" title="Clients" actions={<LinkButton href="/audits/new">New audit</LinkButton>} />
      <Suspense>
        <SearchBar placeholder="Search name, website, contact" filter={{ name: "industry", label: "Industry", options: [{ value: "", label: "All industries" }, ...industries.map((i) => ({ value: i.id, label: i.name }))] }} />
      </Suspense>
      {list.length === 0 ? (
        <Empty title="No clients yet" body="Clients are created when you start a brand audit." action={<LinkButton href="/audits/new">Start an audit</LinkButton>} />
      ) : (
        <ul className="card divide-y divide-border">
          {list.map((c) => {
            const qs = quotes.filter((x) => x.clientId === c.id);
            return (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="flex flex-col gap-1 px-5 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{c.businessName}</p>
                    <p className="truncate text-[13px] text-ink-3">{[c.industryId && indName.get(c.industryId), c.website, c.contactPerson].filter(Boolean).join(" · ") || "No details yet"}</p>
                  </div>
                  <p className="text-[13px] text-ink-2">
                    {qs.length} quotation version{qs.length === 1 ? "" : "s"}
                    {c.nextFollowUp ? ` · follow up ${c.nextFollowUp}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
