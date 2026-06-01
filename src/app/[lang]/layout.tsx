import Link from "next/link";
import { hasLocale, locales, getDictionary } from "@/lib/dictionaries";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Logo } from "@/components/Logo";
import { MobileNav } from "@/components/MobileNav";
import { ProfileAvatar } from "@/components/ProfileAvatar";
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

  const navItems = session?.user
    ? [
        { href: `/${lang}/dashboard`, label: t.nav.dashboard, icon: <LayoutDashboard size={18} /> },
        { href: `/${lang}/calls`,     label: t.nav.calls,     icon: <PhoneCall size={18} /> },
        { href: `/${lang}/profiles`,  label: t.nav.managers,  icon: <Users size={18} /> },
        { href: `/${lang}/analytics`, label: t.nav.analytics, icon: <BarChart2 size={18} /> },
        { href: `/${lang}/api-docs`,  label: t.nav.apiDocs,   icon: <Code2 size={18} /> },
        ...(isAdmin ? [{ href: `/${lang}/admin`, label: t.admin.title, icon: <Shield size={18} /> }] : []),
      ]
    : [];

  return (
    <>
      {/* Header */}
      <header className="relative flex items-center justify-between bg-brand-300 px-4 py-3 shadow-sm border-b border-brand-400 md:px-8">

        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-6">
          <Logo lang={lang} size="sm" />

          {session?.user && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className="rounded-lg p-2 text-brand-800 hover:bg-brand-400 hover:text-brand-900 transition-colors"
                >
                  {item.icon}
                  <span className="sr-only">{item.label}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Right: user area + mobile hamburger */}
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              {/* User pill → settings */}
              <Link
                href={`/${lang}/settings`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-brand-400"
              >
                <ProfileAvatar
                  photo={userImage}
                  name={userName || session.user.email || "?"}
                  className="h-7 w-7 ring-2 ring-brand-600"
                  textClassName="text-xs font-bold"
                />
                <span className="hidden sm:block text-sm font-medium text-brand-900">
                  {userName || session.user.email}
                </span>
              </Link>

              <SignOutButton t={t} lang={lang} />

              {/* Mobile hamburger (hidden on md+) */}
              <div className="md:hidden">
                <MobileNav items={navItems} />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/${lang}/auth/signin`}
                className="rounded-lg border border-brand-500/40 px-3 py-1.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-400"
              >
                {t.auth.signin}
              </Link>
              <Link
                href={`/${lang}/auth/register`}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
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
