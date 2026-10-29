import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { newId } from "../src/lib/ids";
import { seedCatalog } from "../src/server/seed";

const db = getDb();
await seedCatalog(db);
console.log("Catalogue seeded from the Opportunity Board (existing rows kept).");

// First deploy: create the admin from ADMIN_EMAIL / ADMIN_PASSWORD when no user exists yet.
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const [{ n }] = await db.select({ n: count() }).from(users);
if (n === 0 && email && password.length >= 10) {
  await db.insert(users).values({ id: newId("U"), email, name: process.env.ADMIN_NAME || email.split("@")[0], role: "admin", canOverridePrices: true, passwordHash: await bcrypt.hash(password, 12) });
  console.log(`Created first admin ${email}.`);
} else if (n === 0) {
  console.log("No users yet: set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters), or run npm run user:create.");
}
