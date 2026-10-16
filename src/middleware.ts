import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Lindungi seluruh rute dashboard dari akses tanpa cookie sesi
  if (pathname.startsWith("/dashboard")) {
    const sessionToken = request.cookies.get("multigrade_session")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Jika sudah login dan mencoba mengakses halaman /login, redirect ke /dashboard
  if (pathname === "/login") {
    const sessionToken = request.cookies.get("multigrade_session")?.value;
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const response = NextResponse.next();

  // 3. Tambahkan header pengaman tambahan
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, sw.js (PWA assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.svg).*)",
  ],
};
