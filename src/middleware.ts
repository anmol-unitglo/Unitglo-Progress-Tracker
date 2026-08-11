import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;

    // RBAC: Protect routes based on role prefixes
    if (path.startsWith("/ceo") && role !== "CEO") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (path.startsWith("/pm") && role !== "PM") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (path.startsWith("/developer") && role !== "DEVELOPER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (path.startsWith("/tester") && role !== "TESTER") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
