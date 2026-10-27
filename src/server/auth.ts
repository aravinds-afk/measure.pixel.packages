import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { users } from "./db/schema";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "@/lib/session-token";
import { HttpError } from "./http";

export type CurrentUser = { id: string; email: string; name: string; role: "admin" | "consultant"; canOverridePrices: boolean };

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);

let dummyHash: string | null = null;

export async function authenticate(email: string, password: string): Promise<CurrentUser | null> {
  const db = getDb();
  const [u] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  // Compare against a dummy hash when the user does not exist to keep timing uniform.
  dummyHash ??= await bcrypt.hash("timing-equaliser", 12);
  const ok = await bcrypt.compare(password, u?.passwordHash ?? dummyHash);
  if (!u || !ok || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, canOverridePrices: u.role === "admin" || u.canOverridePrices };
}

export async function startSession(user: CurrentUser) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Re-reads the user from the database so deactivation and role changes apply immediately. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const claims = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const [u] = await getDb().select().from(users).where(eq(users.id, claims.sub));
  if (!u || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, canOverridePrices: u.role === "admin" || u.canOverridePrices };
}

/** For API routes: throws 401/403. */
export async function requireUser(role?: "admin"): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new HttpError(401, "Sign in required");
  if (role === "admin" && u.role !== "admin") throw new HttpError(403, "Admin permission required");
  return u;
}

/** For server components: redirects to /login. */
export async function requirePageUser(role?: "admin"): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (role === "admin" && u.role !== "admin") redirect("/");
  return u;
}
