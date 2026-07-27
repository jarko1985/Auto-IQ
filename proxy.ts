import { auth } from "@/auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getPostLoginPath } from "@/features/auth/route-for-role";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require authentication (matched against path without locale prefix)
const PROTECTED_PREFIXES = ["/dashboard", "/vendor", "/garage", "/admin"];

// Routes only accessible to unauthenticated users (redirect to dashboard if signed in)
const AUTH_ONLY_PREFIXES = ["/sign-in", "/sign-up", "/forgot-password"];

function getPathWithoutLocale(pathname: string): string {
  return pathname.replace(/^\/(en|ar)/, "") || "/";
}

function getLocale(pathname: string): string {
  const match = pathname.match(/^\/(en|ar)/);
  return match?.[1] ?? "en";
}

export default auth(function proxy(request: NextRequest & { auth: Session | null }) {
  const { pathname } = request.nextUrl;
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const locale = getLocale(pathname);

  const isAuthenticated = !!request.auth?.user;

  // Redirect authenticated users away from auth pages, to their role's portal
  if (isAuthenticated && AUTH_ONLY_PREFIXES.some((p) => pathWithoutLocale.startsWith(p))) {
    const target = getPostLoginPath(request.auth!.user.role);
    return NextResponse.redirect(new URL(`/${locale}${target}`, request.url));
  }

  // Protect private routes
  if (!isAuthenticated && PROTECTED_PREFIXES.some((p) => pathWithoutLocale.startsWith(p))) {
    const url = new URL(`/${locale}/sign-in`, request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
