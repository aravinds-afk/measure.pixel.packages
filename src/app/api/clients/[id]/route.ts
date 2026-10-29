import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { assertSameOrigin, handle, HttpError, parseJson } from "@/server/http";
import { syncNow } from "@/server/sheets/sync";

const schema = z.object({
  businessName: z.string().trim().min(1).max(200),
  website: z.string().max(500),
  contactPerson: z.string().max(200),
  phone: z.string().max(50),
  email: z.string().max(200),
  notes: z.string().max(5000),
  nextFollowUp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  industryId: z.string().max(80).nullable(),
  touchContact: z.boolean().optional(),
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  await requireUser();
  const { id } = await ctx.params;
  const { touchContact, ...body } = await parseJson(req, schema);
  const db = getDb();
  const now = new Date().toISOString();
  const [row] = await db.update(s.clients).set({ ...body, updatedAt: now, ...(touchContact ? { lastContactAt: now } : {}) }).where(eq(s.clients.id, id)).returning();
  if (!row) throw new HttpError(404, "Client not found");
  const sync = await syncNow(db, "client", id);
  return NextResponse.json({ ok: true, sync });
});
