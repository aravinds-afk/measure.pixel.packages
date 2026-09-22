import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "mp_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "measure-pixel-dev-secret");

const PUBLIC_PATHS = ["/", "/login", "/forgot-password", "/reset-password", "/request-demo"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon") ||
    /\.(svg|png|jpg|jpeg|webp|ico|css|js)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let session: { role?: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      session = payload as { role?: string };
    } catch {
      session = null;
    }
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Note: deliberately NOT bouncing authenticated visitors away from "/" or
  // "/login" here. This check only verifies the JWT signature, but sessions
  // can also be invalidated in the DB (single-active-session enforcement) —
  // that's checked by getSession() in the (auth) layout and root page,
  // which is the DB-aware source of truth for "am I really still logged
  // in". Doing the bounce here too, from a stale-but-signature-valid
  // cookie, would redirect straight back to a page that immediately
  // redirects to /login again, looping forever.

  if (session && pathname.startsWith("/portal") && session.role !== "CUSTOMER") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (session && session.role === "CUSTOMER" && !pathname.startsWith("/portal") && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
