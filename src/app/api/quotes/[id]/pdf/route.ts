import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { handle } from "@/server/http";
import { pdfFilename, renderQuotePdf } from "@/server/pdf/quote-pdf";
import { clientViewOf } from "@/server/services/client-quote";
import { getQuote } from "@/server/services/quotes";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const db = getDb();
  const view = await clientViewOf(db, await getQuote(db, id));
  const pdf = await renderQuotePdf(view);
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${pdfFilename(view)}"`, "cache-control": "private, no-store" },
  });
});
