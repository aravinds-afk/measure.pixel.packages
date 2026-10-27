import "server-only";
import { eq } from "drizzle-orm";
import { toClientView, type ClientQuoteView } from "@/lib/client-view";
import type { QuoteDoc } from "@/lib/quote-schema";
import type { DB } from "../db";
import * as s from "../db/schema";
import { getSettings } from "../settings";
import { effectiveStatus, type QuoteRow } from "./quotes";

/** The only path from a stored quotation to anything a client sees. */
export async function clientViewOf(db: DB, q: QuoteRow): Promise<ClientQuoteView> {
  const settings = await getSettings(db);
  return toClientView({ number: q.number, version: q.version, status: effectiveStatus(q), issueDate: q.issueDate, validUntil: q.validUntil }, q.doc as QuoteDoc, settings.company);
}

/** Public token lookup: issued quotations only, constant-shape result. */
export async function quoteByToken(db: DB, token: string): Promise<QuoteRow | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const [q] = await db.select().from(s.quotes).where(eq(s.quotes.publicToken, token));
  if (!q || q.status === "draft") return null;
  return q;
}
