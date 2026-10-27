import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, HttpError, parseJson } from "@/server/http";
import { resetToSource, schemas, upsertEntity, type AdminEntity } from "@/server/services/admin";
import { enqueue } from "@/server/sheets/sync";

const ENTITIES = [...Object.keys(schemas), "settings"];

export const POST = handle(async (req: Request, ctx: { params: Promise<{ entity: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser("admin");
  const { entity } = await ctx.params;
  if (!ENTITIES.includes(entity)) throw new HttpError(404, "Unknown settings area");
  const body = await parseJson(req, z.object({ action: z.enum(["upsert", "reset"]), item: z.unknown().optional(), id: z.string().max(80).optional() }));
  const db = getDb();
  const result = body.action === "reset" ? await resetToSource(db, entity as AdminEntity, body.id ?? "") : await upsertEntity(db, user, entity as AdminEntity, body.item);
  if (entity === "services" || entity === "offers" || entity === "industries") await enqueue(db, "catalogue", "all");
  return NextResponse.json(result);
});
