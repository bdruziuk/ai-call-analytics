import Link from "next/link";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { LogoMark } from "@/components/Logo";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { Mic2, BarChart2, Users, Upload, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import { PricingSection } from "@/components/home/PricingSection";

type Props = { params: Promise<{ lang: string }> };

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const [t, session] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
  ]);

  const isLoggedIn = !!session?.user;

  // Fetch current plan for logged-in users (for pricing CTA state)
  let currentPlanId: string | undefined;
  if (session?.user?.id) {
    const sub = await db.subscription.findUnique({
      where:  { userId: session.user.id },
      select: { planId: true },
    });
    currentPlanId = sub?.planId ?? "free";
  }

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white py-24 md:py-32">
        {/* Soft radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(28,120,174,0.13) 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 80% 60%, rgba(28,120,174,0.07) 0%, transparent 60%)",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          {/* Badge */}
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{ borderColor: "rgba(28,120,174,0.25)", background: "rgba(28,120,174,0.07)", color: "#1C78AE" }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#1C78AE" }} />
            {t.home.badge}
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-[#06142E] md:text-6xl lg:text-7xl">
            {t.home.heroHeadline}
            <br />
            <span style={{ color: "#1C78AE" }}>
              {t.home.heroAccent}
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-500 md:text-xl">
            {t.home.heroSub}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/${lang}/dashboard`}
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold text-white shadow-lg transition hover:opacity-90"
              style={{ background: "#1C78AE" }}
            >
              {t.home.ctaDashboard}
              <ArrowRight size={18} />
            </Link>

            {!isLoggedIn && (
              <Link
                href={`/${lang}/auth/register`}
                className="inline-flex items-center gap-2 rounded-xl border-2 bg-white px-7 py-3.5 font-semibold transition hover:bg-slate-50"
                style={{ borderColor: "rgba(28,120,174,0.3)", color: "#1C78AE" }}
              >
                {t.home.ctaSignup}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <section className="bg-[#06142E] py-8 md:py-10">
        <dl className="mx-auto grid max-w-3xl grid-cols-3 divide-x divide-white/10 px-2 md:px-6">
          {[
            { value: "3",     label: t.home.stat1Label },
            { value: "12+",   label: t.home.stat2Label },
            { value: "< 60s", label: t.home.stat3Label },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-2 text-center md:px-4">
              <dt className="text-2xl font-extrabold text-white md:text-3xl">{value}</dt>
              <dd className="text-[10px] font-medium uppercase tracking-widest text-white/40 md:text-xs">
                {label}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-[#06142E]">
            {t.home.featuresTitle}
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {([
              { Icon: Mic2,      title: t.home.feat1Title, desc: t.home.feat1Desc, bg: "#1C78AE" },
              { Icon: BarChart2, title: t.home.feat2Title, desc: t.home.feat2Desc, bg: "#155f8a" },
              { Icon: Users,     title: t.home.feat3Title, desc: t.home.feat3Desc, bg: "#0e4a6e" },
            ] as const).map(({ Icon, title, desc, bg }) => (
              <div
                key={title}
                className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
              >
                <div
                  className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: bg }}
                >
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#06142E]">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-14 text-center text-3xl font-extrabold tracking-tight text-[#06142E]">
            {t.home.howTitle}
          </h2>

          <div className="grid gap-10 md:grid-cols-3">
            {([
              { Icon: Upload,     num: "01", title: t.home.step1Title, desc: t.home.step1Desc },
              { Icon: Sparkles,   num: "02", title: t.home.step2Title, desc: t.home.step2Desc },
              { Icon: TrendingUp, num: "03", title: t.home.step3Title, desc: t.home.step3Desc },
            ] as const).map(({ Icon, num, title, desc }, i) => (
              <div key={num} className="relative flex flex-col gap-4">
                {i < 2 && (
                  <div
                    aria-hidden
                    className="absolute top-6 left-full hidden w-10 border-t-2 border-dashed border-slate-200 md:block"
                    style={{ transform: "translateX(-50%)" }}
                  />
                )}
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white"
                  style={{ background: "#1C78AE" }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                    {num}
                  </p>
                  <h3 className="mb-2 text-lg font-bold text-[#06142E]">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <PricingSection
        t={t.home}
        lang={lang}
        currentPlanId={currentPlanId}
        isLoggedIn={isLoggedIn}
      />

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{ background: "linear-gradient(160deg,#1C78AE 0%,#0e4a6e 100%)" }}
      >
        <div className="mx-auto max-w-xl px-6 text-center">
          <div className="mx-auto mb-7 inline-flex rounded-2xl bg-white p-3 shadow-xl shadow-black/20">
            <LogoMark size={48} />
          </div>

          <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">
            {t.home.ctaTitle}
          </h2>
          <p className="mb-9 text-lg text-white/75">{t.home.ctaDesc}</p>

          <Link
            href={isLoggedIn ? `/${lang}/dashboard` : `/${lang}/auth/register`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-[#06142E] shadow-xl shadow-black/25 transition hover:bg-slate-50"
          >
            {isLoggedIn ? t.home.ctaDashboard : t.home.ctaButton}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <p className="text-center text-sm text-slate-400">
          © {new Date().getFullYear()} AI Call Analytics
        </p>
      </footer>
    </main>
  );
}
