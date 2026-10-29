import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

type Holder = { db?: DB; client?: Client };
const g = globalThis as unknown as { __mpdb?: Holder };
g.__mpdb ??= {};

export function createDb(url: string, authToken?: string): { db: DB; client: Client } {
  const client = createClient({ url, authToken });
  return { db: drizzle(client, { schema }), client };
}

/** Process-wide database handle. DATABASE_URL: file:./data/local.db locally, libsql://… (Turso) in production. */
export function getDb(): DB {
  if (!g.__mpdb!.db) {
    const url = process.env.DATABASE_URL ?? "file:./data/local.db";
    const { db, client } = createDb(url, process.env.DATABASE_AUTH_TOKEN || undefined);
    g.__mpdb!.db = db;
    g.__mpdb!.client = client;
  }
  return g.__mpdb!.db!;
}

/** Tests inject an isolated database. */
export function setDbForTests(db: DB) {
  g.__mpdb!.db = db;
}

export async function runMigrations(db: DB) {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

export { schema };
