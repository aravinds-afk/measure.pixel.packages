import { jwtVerify, SignJWT } from "jose";

/** Edge-safe session token helpers (used by middleware and server code). */

export const SESSION_COOKIE = "mp_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type SessionClaims = { sub: string; role: "admin" | "consultant"; name: string };

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setIssuer("mp-growth-advisor")
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "mp-growth-advisor", algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    const role = payload.role === "admin" ? "admin" : "consultant";
    return { sub: payload.sub, role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
