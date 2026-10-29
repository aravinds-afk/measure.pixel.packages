import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ClientQuote } from "@/components/quote/client-view";
import { buttonClass } from "@/components/ui";
import { requirePageUser } from "@/server/auth";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { clientViewOf } from "@/server/services/client-quote";

export const metadata = { title: "Present" };

/** Client presentation mode: server renders the sanitised view; no internal data reaches the browser. */
export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const { id } = await params;
  const db = getDb();
  const [q] = await db.select().from(s.quotes).where(eq(s.quotes.id, id));
  if (!q) notFound();
  const view = await clientViewOf(db, q);
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg px-4 py-6 sm:px-8 sm:py-10">
      <div className="no-print mx-auto mb-4 flex max-w-[860px] justify-between gap-2">
        <Link href={`/quotes/${id}`} className={buttonClass("ghost", "sm")}>← Exit presentation</Link>
        <a href={`/api/quotes/${id}/pdf`} className={buttonClass("secondary", "sm")}>Download PDF</a>
      </div>
      <ClientQuote v={view} />
    </div>
  );
}
