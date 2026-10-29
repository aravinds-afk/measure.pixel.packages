import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, parseJson } from "@/server/http";
import { intakeSchema, startAudit } from "@/server/services/audits";
import { enqueue } from "@/server/sheets/sync";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const input = await parseJson(req, intakeSchema);
  const db = getDb();
  const audit = await startAudit(db, user, input);
  // Client row reaches Sheets with the next confirmed sync (audit save, quotation).
  await enqueue(db, "client", audit.clientId);
  return NextResponse.json({ auditId: audit.id, clientId: audit.clientId });
});
