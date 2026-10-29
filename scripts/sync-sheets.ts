import { getDb } from "../src/server/db";
import { defaultApi, processPending } from "../src/server/sheets/sync";

const conn = defaultApi();
if (!conn) {
  console.error("Google Sheets is not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID).");
  process.exit(1);
}
const out = await processPending(getDb(), conn.api, 200);
console.table(Object.entries(out).map(([id, r]) => ({ id, ...r })));
