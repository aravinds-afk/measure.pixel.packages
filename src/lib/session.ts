import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const SESSION_COOKIE = "mp_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "measure-pixel-dev-secret");

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  sid: string;
};

/**
 * Creates a new session and rotates the user's activeSessionId in the DB.
 * Rotating it invalidates any session token previously issued to this
 * account, which is what enforces "one device at a time".
 */
export async function createSession(payload: Omit<SessionPayload, "sid">) {
  const sid = crypto.randomUUID();
  await prisma.user.update({ where: { id: payload.sub }, data: { activeSessionId: sid } });

  const token = await new SignJWT({ ...payload, sid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Verifies the session cookie AND that it's still the account's single
 * active session. If another device has since logged in (rotating
 * activeSessionId), this returns null and clears the stale cookie.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let payload: SessionPayload;
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as unknown as SessionPayload;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { activeSessionId: true } });
  if (!user || user.activeSessionId !== payload.sid) {
    // Can't mutate cookies from a Server Component render — callers (every
    // protected layout) already redirect to /login when this returns null,
    // and the stale cookie can never re-authenticate since the DB no longer
    // matches its sid. It gets overwritten on the next real login or logout.
    return null;
  }

  return payload;
}

export { SESSION_COOKIE };
