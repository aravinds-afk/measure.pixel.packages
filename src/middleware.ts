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

  if (session && (pathname === "/login" || pathname === "/")) {
    const url = req.nextUrl.clone();
    url.pathname = session.role === "CUSTOMER" ? "/portal" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

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
