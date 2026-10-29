import fs from "node:fs";
import { getDb, runMigrations } from "../src/server/db";

const url = process.env.DATABASE_URL ?? "file:./data/local.db";
if (url.startsWith("file:")) fs.mkdirSync("data", { recursive: true });
await runMigrations(getDb());
console.log("Migrations applied to", url.replace(/\/\/.*@/, "//***@"));
