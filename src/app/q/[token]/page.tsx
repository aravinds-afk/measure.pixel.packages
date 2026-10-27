import { notFound } from "next/navigation";
import { ClientQuote } from "@/components/quote/client-view";
import { getDb } from "@/server/db";
import { clientViewOf, quoteByToken } from "@/server/services/client-quote";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proposal", robots: { index: false, follow: false } };

/** Public, read-only proposal. Renders the sanitised client view only. */
export default async function PublicQuote({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const q = await quoteByToken(db, token);
  if (!q) notFound();
  const view = await clientViewOf(db, q);
  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <ClientQuote v={view} />
      <div className="mx-auto mt-2 flex max-w-[860px] justify-end">
        <a href={`/q/${token}/pdf`} className="text-[14px] font-medium underline underline-offset-4">Download PDF</a>
      </div>
    </main>
  );
}
