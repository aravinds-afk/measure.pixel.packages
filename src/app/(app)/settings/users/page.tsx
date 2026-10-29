import { asc } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { requirePageUser } from "@/server/auth";
import { UsersAdmin } from "./users-admin";

export const metadata = { title: "Users" };

export default async function UsersSettings() {
  const me = await requirePageUser("admin");
  const users = await getDb().select({ id: s.users.id, email: s.users.email, name: s.users.name, role: s.users.role, canOverridePrices: s.users.canOverridePrices, active: s.users.active }).from(s.users).orderBy(asc(s.users.createdAt));
  return <UsersAdmin users={users} meId={me.id} />;
}
