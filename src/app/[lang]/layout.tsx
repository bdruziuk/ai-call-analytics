import Link from "next/link";
import { hasLocale, locales, getDictionary } from "@/lib/dictionaries";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Logo } from "@/components/Logo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { notFound } from "next/navigation";
import { LayoutDashboard, PhoneCall, Users, Shield, Code2, BarChart2 } from "lucide-react";
import { db } from "@/lib/db";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getDictionary(lang),
  ]);

  // Always read image/name from DB so changes made in Settings are reflected
  // immediately without requiring a re-login.
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const dbUser = userId
    ? await db.user.findUnique({ where: { id: userId }, select: { name: true, image: true } })
    : null;

  const userImage = dbUser?.image ?? session?.user?.image ?? null;
  const userName  = dbUser?.name  ?? session?.user?.name  ?? null;

  const initials = session?.user
    ? (userName || session.user.email || "?")[0].toUpperCase()
    : "";

  const isAdmin = !!session?.user?.email &&
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .includes((session.user.email ?? "").toLowerCase());

  return (
    <>
      {/* Header — brand-300 = PANTONE 2905 PC background, dark text on top */}
      <header className="flex items-center justify-between bg-brand-300 px-8 py-3 shadow-sm border-b border-brand-400">
        {/* Logo + nav */}
        <div className="flex items-center gap-6">
          <Logo lang={lang} size="sm" />

          {session?.user && (
            <nav className="flex items-center gap-1">
              <Link
                href={`/${lang}/dashboard`}
                title={t.nav.dashboard}
                className="rounded-lg p-2 text-brand-800 hover:bg-brand-400 hover:text-brand-900 transition-colors"
              >
                <LayoutDashboard size={20} />
                <span className="sr-only">{t.nav.dashboard}</span>
              </Link>
              <Link
                href={`/${lang}/calls`}
                title={t.nav.calls}
                className="rounded-lg p-2 text-brand-800 hover:bg-brand-400 hover:text-brand-900 transition-colors"
              >
                <PhoneCall size={20} />
                <span className="sr-only">{t.nav.calls}</span>
              </Link>
              <Link
                href={`/${lang}/profiles`}
                title={t.nav.managers}
                className="rounded-lg p-2 text-brand-800 hover:bg-brand-400 hover:text-brand-900 transition-colors"
              >
                <Users size={20} />
                <span className="sr-only">{t.nav.managers}</span>
              </Link>

              <Link
                href={`/${lang}/analytics`}
                title={t.nav.analytics}
                className="rounded-lg p-2 text-brand-800 hover:bg-brand-400 hover:text-brand-900 transition-colors"
              >
                <BarChart2 size={20} />
                <span className="sr-only">{t.nav.analytics}</span>
              </Link>

              <Link
                href={`/${lang}/api-docs`}
                title={t.nav.apiDocs}
                className="rounded-lg p-2 text-brand-800 hover:bg-brand-400 hover:text-brand-900 transition-colors"
              >
                <Code2 size={20} />
                <span className="sr-only">{t.nav.apiDocs}</span>
              </Link>

              {isAdmin && (
                <Link
                  href={`/${lang}/admin`}
                  title={t.admin.title}
                  className="rounded-lg p-2 text-brand-800 hover:bg-brand-400 hover:text-brand-900 transition-colors"
                >
                  <Shield size={20} />
                  <span className="sr-only">{t.admin.title}</span>
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right: user area */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              {/* Clickable user pill → settings page */}
              <Link
                href={`/${lang}/settings`}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-brand-400"
              >
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userImage}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-brand-600"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {initials}
                  </span>
                )}
                <span className="text-sm font-medium text-brand-900">
                  {userName || session.user.email}
                </span>
              </Link>

              <SignOutButton t={t} lang={lang} />
            </>
          ) : (
            /* Unauthenticated — show Sign In + Register */
            <div className="flex items-center gap-2">
              <Link
                href={`/${lang}/auth/signin`}
                className="rounded-lg border border-brand-500/40 px-4 py-1.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-400"
              >
                {t.auth.signin}
              </Link>
              <Link
                href={`/${lang}/auth/register`}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                {t.auth.register}
              </Link>
            </div>
          )}
        </div>
      </header>
      {children}
    </>
  );
}
