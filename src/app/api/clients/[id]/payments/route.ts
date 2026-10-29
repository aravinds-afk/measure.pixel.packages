import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { assertSameOrigin, handle, HttpError, parseJson } from "@/server/http";

const schema = z.object({
  amount: z.number().int().min(1).max(10_000_000_000),
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quoteId: z.string().max(40).nullable(),
  note: z.string().max(500),
  idempotencyKey: z.string().min(8).max(80),
});

/** Records cash received — kept separate from signed revenue on the dashboard. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await parseJson(req, schema);
  const db = getDb();
  const [c] = await db.select().from(s.clients).where(eq(s.clients.id, id));
  if (!c) throw new HttpError(404, "Client not found");
  const paymentId = `PM-${body.idempotencyKey.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase()}`;
  await db.insert(s.payments).values({ id: paymentId, clientId: id, quoteId: body.quoteId, amount: body.amount, receivedOn: body.receivedOn, note: body.note, createdBy: user.id }).onConflictDoNothing();
  return NextResponse.json({ ok: true, id: paymentId });
});
