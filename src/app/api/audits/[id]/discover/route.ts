import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { discover } from "@/server/discovery/analyze";
import { assertSameOrigin, handle, HttpError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { applyDiscovery } from "@/server/services/audits";

export const maxDuration = 60;

/** Runs public-website discovery and applies verified findings. Rate limited: it makes outbound requests. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await ctx.params;
  await rateLimit(`discover:${user.id}`, 10, 600);
  const db = getDb();
  const [audit] = await db.select().from(s.audits).where(eq(s.audits.id, id));
  if (!audit) throw new HttpError(404, "Audit not found");
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, audit.clientId));
  const industries = await db.select().from(s.industries);

  const result = await discover(
    { website: client.website, instagram: client.instagram, linkedin: client.linkedin, youtube: client.youtube, otherLinks: client.otherLinks },
    industries.filter((i) => i.active).map((i) => ({ id: i.id, name: i.name, keywords: i.keywords })),
  );

  // Discovery takes a while; apply to the latest saved answers so concurrent edits are kept.
  let updated: typeof s.audits.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !updated; attempt++) {
    const [fresh] = await db.select().from(s.audits).where(eq(s.audits.id, id));
    const responses = applyDiscovery(fresh.responses, result);
    [updated] = await db
      .update(s.audits)
      .set({ discovery: result, responses, rev: fresh.rev + 1, updatedAt: new Date().toISOString() })
      .where(and(eq(s.audits.id, id), eq(s.audits.rev, fresh.rev)))
      .returning();
  }
  if (!updated) throw new HttpError(409, "The audit kept changing while the website was inspected. Run discovery again.");

  // Auto-detected business name replaces only a placeholder derived from the domain.
  const host = (() => {
    try {
      return new URL(/^https?:\/\//.test(client.website) ? client.website : `https://${client.website}`).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  let businessName = client.businessName;
  if (result.businessNameCandidate && (client.businessName === host || client.businessName === "Untitled business")) {
    businessName = result.businessNameCandidate;
    await db.update(s.clients).set({ businessName, updatedAt: new Date().toISOString() }).where(eq(s.clients.id, client.id));
  }
  return NextResponse.json({ discovery: result, responses: updated.responses, rev: updated.rev, businessName });
});
