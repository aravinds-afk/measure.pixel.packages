import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { emptyDoc } from "@/lib/lines";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { assertSameOrigin, handle, HttpError, parseJson } from "@/server/http";
import { getSettings } from "@/server/settings";
import { docFromAudit } from "@/server/services/quote-from-audit";
import { createQuote } from "@/server/services/quotes";
import { enqueue } from "@/server/sheets/sync";

const schema = z
  .object({ auditId: z.string().max(40).optional(), clientId: z.string().max(40).optional(), idempotencyKey: z.string().min(8).max(80) })
  .refine((v) => v.auditId || v.clientId, "auditId or clientId is required");

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const input = await parseJson(req, schema);
  const db = getDb();
  const settings = await getSettings(db);
  let doc, clientId: string, auditId: string | null = null;
  if (input.auditId) {
    ({ doc, clientId } = await docFromAudit(db, settings, input.auditId));
    auditId = input.auditId;
  } else {
    const [c] = await db.select().from(s.clients).where(eq(s.clients.id, input.clientId!));
    if (!c) throw new HttpError(404, "Client not found");
    const [ind] = c.industryId ? await db.select().from(s.industries).where(eq(s.industries.id, c.industryId)) : [];
    doc = emptyDoc(settings);
    doc.client = { businessName: c.businessName, contactPerson: c.contactPerson, email: c.email, phone: c.phone, website: c.website, industryName: ind?.name ?? "" };
    clientId = c.id;
  }
  const { quote, created } = await createQuote(db, user, settings, { clientId, auditId, doc, idempotencyKey: input.idempotencyKey });
  if (created) await enqueue(db, "quote", quote.id);
  return NextResponse.json({ quoteId: quote.id, created });
});
