import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { newId } from "../src/lib/ids";

/**
 * Usage: npm run user:create -- --email you@example.com --name "Your Name" --role admin
 * The password is read from the MP_PASSWORD environment variable (never a CLI arg, so it stays out of shell history).
 */
const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
const email = String(args.email ?? "").trim().toLowerCase();
const name = String(args.name ?? email);
const role = args.role === "admin" ? "admin" : "consultant";
const password = process.env.MP_PASSWORD ?? "";
if (!email || password.length < 10) {
  console.error("Provide --email and set MP_PASSWORD (at least 10 characters).");
  process.exit(1);
}
const db = getDb();
const hash = await bcrypt.hash(password, 12);
const [existing] = await db.select().from(users).where(eq(users.email, email));
if (existing) {
  await db.update(users).set({ passwordHash: hash, role, name, active: true }).where(eq(users.id, existing.id));
  console.log(`Updated ${email} (${role}).`);
} else {
  await db.insert(users).values({ id: newId("U"), email, name, role, passwordHash: hash, canOverridePrices: role === "admin" });
  console.log(`Created ${email} (${role}).`);
}
