import { desc, ne } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { getSheetsConfig } from "@/server/sheets/client";
import { TABS } from "@/server/sheets/rows";
import { SheetsAdmin } from "./sheets-admin";

export const metadata = { title: "Google Sheets" };

export default async function SheetsSettings() {
  const cfg = getSheetsConfig();
  const db = getDb();
  const [open, recent] = await Promise.all([
    db.select().from(s.syncJobs).where(ne(s.syncJobs.status, "done")).orderBy(desc(s.syncJobs.updatedAt)).limit(50),
    db.select().from(s.syncJobs).orderBy(desc(s.syncJobs.updatedAt)).limit(10),
  ]);
  return (
    <SheetsAdmin
      configured={!!cfg}
      // Show only non-secret identifiers.
      serviceAccount={cfg?.email ?? null}
      spreadsheetUrl={cfg ? `https://docs.google.com/spreadsheets/d/${cfg.spreadsheetId}/edit` : null}
      tabs={Object.values(TABS).map((t) => ({ name: t.name, headers: t.headers }))}
      open={open.map((j) => ({ id: j.id, entity: j.entity, entityId: j.entityId, status: j.status, attempts: j.attempts, error: j.lastError, at: j.updatedAt }))}
      recent={recent.map((j) => ({ id: j.id, entity: j.entity, entityId: j.entityId, status: j.status, attempts: j.attempts, error: j.lastError, at: j.updatedAt }))}
    />
  );
}
