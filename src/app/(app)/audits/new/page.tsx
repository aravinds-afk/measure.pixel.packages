import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { requirePageUser } from "@/server/auth";
import { DiscoveryForm } from "./discovery-form";

export const metadata = { title: "New brand audit" };

export default async function NewAuditPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  await requirePageUser();
  const { clientId } = await searchParams;
  const db = getDb();
  const [client] = clientId ? await db.select().from(s.clients).where(eq(s.clients.id, clientId)) : [];
  const drafts = await db
    .select({ id: s.audits.id, updatedAt: s.audits.updatedAt, name: s.clients.businessName })
    .from(s.audits)
    .innerJoin(s.clients, eq(s.clients.id, s.audits.clientId))
    .where(eq(s.audits.status, "draft"))
    .orderBy(desc(s.audits.updatedAt))
    .limit(5);

  return (
    <div className="mx-auto max-w-[640px]">
      <p className="eyebrow mb-3">New brand audit</p>
      <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">
        Understand the business.
        <br />
        <span className="text-ink-3">Find the growth opportunity.</span>
      </h1>
      <div className="mt-8">
        <DiscoveryForm client={client ? { id: client.id, businessName: client.businessName, website: client.website, instagram: client.instagram, linkedin: client.linkedin, youtube: client.youtube, otherLinks: client.otherLinks } : null} />
      </div>
      {drafts.length > 0 && (
        <section className="mt-12">
          <p className="eyebrow mb-3">Continue an unfinished audit</p>
          <ul className="card divide-y divide-border">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/audits/${d.id}`} className="flex min-h-[52px] items-center justify-between px-4 py-3 hover:bg-surface-2">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-[13px] text-ink-3">{new Date(d.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
