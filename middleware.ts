import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type AppRole = "ADMIN" | "LECTURER" | "STUDENT";

const roleHome = {
  ADMIN: "/admin",
  LECTURER: "/lecturer",
  STUDENT: "/student"
} satisfies Record<AppRole, string>;

function isAppRole(role: unknown): role is AppRole {
  return role === "ADMIN" || role === "LECTURER" || role === "STUDENT";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET
  });

  if (pathname === "/login" && isAppRole(token?.role)) {
    return NextResponse.redirect(new URL(roleHome[token.role], request.url));
  }

  const protectedPrefix = ["/admin", "/lecturer", "/student"].find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!protectedPrefix) {
    return NextResponse.next();
  }

  if (!token || token.status !== "ACTIVE" || !isAppRole(token.role)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (protectedPrefix === "/admin" && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome[token.role], request.url));
  }

  if (protectedPrefix === "/lecturer" && token.role !== "LECTURER") {
    return NextResponse.redirect(new URL(roleHome[token.role], request.url));
  }

  if (protectedPrefix === "/student" && token.role !== "STUDENT") {
    return NextResponse.redirect(new URL(roleHome[token.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/lecturer/:path*", "/student/:path*"]
};
