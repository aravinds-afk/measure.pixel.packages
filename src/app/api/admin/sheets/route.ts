import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { assertSameOrigin, handle, HttpError, parseJson } from "@/server/http";
import { defaultApi, ensureTabs, processPending, resetSheetCache, syncNow } from "@/server/sheets/sync";

/** Admin: create tabs + push the catalogue (connection test), or retry the queue. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  await requireUser("admin");
  const { action } = await parseJson(req, z.object({ action: z.enum(["setup", "retry"]) }));
  const conn = defaultApi();
  if (!conn) throw new HttpError(409, "Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_SHEETS_SPREADSHEET_ID on the server.");
  const db = getDb();
  if (action === "setup") {
    resetSheetCache();
    try {
      await ensureTabs(conn.api);
    } catch (e) {
      throw new HttpError(502, `Could not reach the spreadsheet: ${(e as Error).message}`);
    }
    const catalogue = await syncNow(db, "catalogue", "all", conn.api);
    return NextResponse.json({ ok: catalogue.status === "synced", catalogue });
  }
  const results = await processPending(db, conn.api, 100);
  return NextResponse.json({ results });
});
