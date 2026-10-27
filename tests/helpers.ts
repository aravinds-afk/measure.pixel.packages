import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDb, runMigrations } from "@/server/db";
import { seedCatalog } from "@/server/seed";
import type { CurrentUser } from "@/server/auth";

export async function testDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mpga-"));
  const { db, client } = createDb(`file:${path.join(dir, "test.db")}`);
  await runMigrations(db);
  await seedCatalog(db);
  return { db, close: () => { client.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

export const consultant: CurrentUser = { id: "U-CONSULTANT", email: "c@example.com", name: "Consultant", role: "consultant", canOverridePrices: false };
export const admin: CurrentUser = { id: "U-ADMIN", email: "a@example.com", name: "Admin", role: "admin", canOverridePrices: true };
