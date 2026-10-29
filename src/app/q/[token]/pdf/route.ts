import { getDb } from "@/server/db";
import { handle, HttpError } from "@/server/http";
import { pdfFilename, renderQuotePdf } from "@/server/pdf/quote-pdf";
import { rateLimit } from "@/server/rate-limit";
import { clientViewOf, quoteByToken } from "@/server/services/client-quote";

export const runtime = "nodejs";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  await rateLimit(`public-pdf:${ip}`, 30, 600);
  const db = getDb();
  const q = await quoteByToken(db, token);
  if (!q) throw new HttpError(404, "This link is not valid or has been disabled.");
  const view = await clientViewOf(db, q);
  const pdf = await renderQuotePdf(view);
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${pdfFilename(view)}"`, "cache-control": "private, no-store", "x-robots-tag": "noindex" },
  });
});
