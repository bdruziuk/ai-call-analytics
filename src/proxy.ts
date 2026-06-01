import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const locales = ["uk", "en", "ru"];
const defaultLocale = "uk";

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  if (/\buk\b/i.test(acceptLanguage)) return "uk";
  if (/\bru\b/i.test(acceptLanguage)) return "ru";
  if (/\ben\b/i.test(acceptLanguage)) return "en";
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Add locale prefix if missing
  const pathnameHasLocale = locales.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // 2. Auth guard for protected sections
  // pathname shape: /uk/dashboard, /uk/calls/xxx, /uk/auth/signin, /uk, ...
  const segments = pathname.split("/"); // ['', 'uk', 'dashboard', ...]
  const locale = segments[1];           // 'uk' | 'en' | 'ru'
  const section = segments[2] ?? "";    // 'dashboard' | 'calls' | 'auth' | ''

  const isProtected =
    section === "dashboard" ||
    section === "calls" ||
    section === "settings" ||
    section === "admin";

  // forgot-password and reset-password are accessible even when logged in
  const authSubsection = segments[3] ?? "";
  const isAuthPage =
    section === "auth" &&
    authSubsection !== "forgot-password" &&
    authSubsection !== "reset-password";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isAuthenticated = !!token;

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/signin`;
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.searchParams.delete("callbackUrl");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
