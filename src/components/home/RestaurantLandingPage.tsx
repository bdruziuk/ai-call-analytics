"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PhoneCall, BarChart3, TrendingUp, Clock,
  CheckCircle2, ChevronDown, ArrowRight, Shield,
  Target, Sparkles, DollarSign, Star, MapPin,
} from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";

type L = typeof ukDict["landing"];

/* ── Design tokens ─────────────────────────────────────────────────────── */
const BLUE = "#1C78AE";
const DARK = "#0F172A";

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD MOCKUP
   ══════════════════════════════════════════════════════════════════════════ */
function DashboardMockup({ l }: { l: L }) {
  const stats = [
    { label: l.mockScore,    value: "8.4", trend: l.mockTrendScore    },
    { label: l.mockUpsell,   value: "34%", trend: l.mockTrendUpsell   },
    { label: l.mockLost,     value: "7",   trend: l.mockTrendLost     },
    { label: l.mockDuration, value: "2:48",trend: l.mockTrendDuration },
  ];
  const operators = [
    { name: "Марія К.",  score: 9.2, upsell: "67%", pct: "92%" },
    { name: "Дмитро В.", score: 8.7, upsell: "52%", pct: "87%" },
    { name: "Олена М.",  score: 7.1, upsell: "29%", pct: "71%" },
  ];

  return (
    <div className="relative mx-auto mt-14 w-full max-w-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-3xl"
        style={{ background: `radial-gradient(ellipse at center, ${BLUE}22 0%, transparent 70%)` }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-brand-100/60">
        {/* Chrome */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="mx-auto text-[11px] font-medium text-slate-400">AI Call Analytics</span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 md:grid-cols-4 md:divide-y-0">
          {stats.map((s) => (
            <div key={s.label} className="p-3 text-center">
              <p className="text-[9px] uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
              <p className="text-[10px] font-semibold text-emerald-600">{s.trend}</p>
            </div>
          ))}
        </div>

        {/* Operators */}
        <div className="p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {l.mockOperators}
          </p>
          <div className="space-y-2.5">
            {operators.map((op) => (
              <div key={op.name} className="flex items-center gap-3">
                <span className="w-18 shrink-0 text-xs font-medium text-slate-700">{op.name}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-1.5">
                  <div className="h-full rounded-full" style={{ width: op.pct, background: BLUE }} />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-bold text-slate-900">{op.score}</span>
                <span className="w-10 shrink-0 text-right text-[10px] font-semibold text-emerald-600">{op.upsell}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI insight */}
        <div className="mx-4 mb-4 rounded-xl px-4 py-3" style={{ background: `${BLUE}0d`, border: `1px solid ${BLUE}22` }}>
          <div className="flex items-start gap-2">
            <Sparkles size={13} style={{ color: BLUE }} className="mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-slate-700">
              <strong style={{ color: BLUE }}>{l.mockInsightLabel}</strong>{" "}{l.mockInsightText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FAQ ACCORDION
   ══════════════════════════════════════════════════════════════════════════ */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between py-5 text-left">
        <span className="pr-4 text-base font-semibold text-slate-900">{q}</span>
        <ChevronDown
          size={18}
          className="shrink-0 text-slate-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LEAD CAPTURE FORM
   ══════════════════════════════════════════════════════════════════════════ */
function LeadForm({ l }: { l: L }) {
  const [form, setForm] = useState({ name: "", restaurant: "", phone: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-xl">
        <CheckCircle2 size={52} className="mx-auto mb-4" style={{ color: BLUE }} />
        <h3 className="text-xl font-extrabold text-slate-900">{l.successTitle}</h3>
        <p className="mt-2 text-slate-600">{l.successText}</p>
      </div>
    );
  }

  const fields = [
    { id: "name" as const,       label: l.fieldName,       type: "text",  ph: l.fieldNamePh       },
    { id: "restaurant" as const, label: l.fieldRestaurant, type: "text",  ph: l.fieldRestaurantPh },
    { id: "phone" as const,      label: l.fieldPhone,      type: "tel",   ph: l.fieldPhonePh      },
    { id: "email" as const,      label: l.fieldEmail,      type: "email", ph: l.fieldEmailPh      },
  ];

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-xl md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{f.label}</label>
            <input
              type={f.type}
              required
              value={form[f.id]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.id]: e.target.value }))}
              placeholder={f.ph}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        ))}
      </div>
      {status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{l.errorText}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-200/60 transition hover:opacity-90 disabled:opacity-60"
        style={{ background: BLUE }}
      >
        {status === "loading" ? l.submitting : l.submitBtn}
      </button>
      <p className="mt-3 text-center text-xs text-slate-400">{l.nospam}</p>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
type Props = { lang: string; isLoggedIn: boolean; t: typeof ukDict };

export function RestaurantLandingPage({ lang, isLoggedIn, t }: Props) {
  const l = t.landing;

  const problems = [
    { Icon: Clock,      iconCls: "bg-amber-100 text-amber-600",  title: l.p1title, impact: l.p1impact, stat: l.p1stat },
    { Icon: DollarSign, iconCls: "bg-red-100 text-red-600",      title: l.p2title, impact: l.p2impact, stat: l.p2stat },
    { Icon: MapPin,     iconCls: "bg-purple-100 text-purple-600",title: l.p3title, impact: l.p3impact, stat: l.p3stat },
  ];

  const steps = [
    { Icon: PhoneCall,  num: 1, title: l.step1title, desc: l.step1desc },
    { Icon: Sparkles,   num: 2, title: l.step2title, desc: l.step2desc },
    { Icon: BarChart3,  num: 3, title: l.step3title, desc: l.step3desc },
    { Icon: TrendingUp, num: 4, title: l.step4title, desc: l.step4desc },
  ];

  const features = [
    { Icon: Shield,     iconCls: "bg-brand-50 text-brand-600",    title: l.feat1title, desc: l.feat1desc, outcome: l.feat1outcome, badges: [l.feat1badge1, l.feat1badge2] },
    { Icon: Target,     iconCls: "bg-red-50 text-red-600",      title: l.feat2title, desc: l.feat2desc, outcome: l.feat2outcome, badges: [l.feat2badge1, l.feat2badge2] },
    { Icon: DollarSign, iconCls: "bg-emerald-50 text-emerald-600", title: l.feat3title, desc: l.feat3desc, outcome: l.feat3outcome, badges: [l.feat3badge1, l.feat3badge2] },
    { Icon: Clock,      iconCls: "bg-purple-50 text-purple-600",title: l.feat4title, desc: l.feat4desc, outcome: l.feat4outcome, badges: [l.feat4badge1, l.feat4badge2] },
  ];

  const faqs = [
    { q: l.faq1q, a: l.faq1a },
    { q: l.faq2q, a: l.faq2a },
    { q: l.faq3q, a: l.faq3a },
    { q: l.faq4q, a: l.faq4a },
    { q: l.faq5q, a: l.faq5a },
  ];

  return (
    <div className="overflow-x-hidden bg-white">

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="relative bg-white pt-16 pb-4 md:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(37,99,235,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 text-center md:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{ borderColor: `${BLUE}30`, background: `${BLUE}0d`, color: BLUE }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: BLUE }} />
            {l.badge}
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            {l.heroH1a}{" "}
            <span style={{ color: BLUE }}>{l.heroH1accent}</span>{" "}
            {l.heroH1b}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500 md:text-xl">
            {l.heroSub1}{" "}
            <strong className="text-slate-700">{l.heroSubStrong}</strong>
            {l.heroSub2}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#audit"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-200/60 transition hover:opacity-90"
              style={{ background: BLUE }}>
              {l.cta1}
              <ArrowRight size={18} />
            </a>
            <a href="#how"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700">
              {l.cta2}
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            {[l.trust1, l.trust2, l.trust3].map((t) => <span key={t}>{t}</span>)}
          </div>

          <DashboardMockup l={l} />
        </div>
      </section>

      {/* ══ PROBLEM ═══════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-600">{l.s2label}</p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{l.s2title}</h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-slate-500">{l.s2sub}</p>

          <div className="grid gap-5 md:grid-cols-3">
            {problems.map(({ Icon, iconCls, title, impact, stat }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-brand-100">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconCls}`}>
                  <Icon size={20} />
                </div>
                <p className="mb-2 text-base font-bold text-slate-900">{title}</p>
                <p className="mb-4 text-sm text-red-600">→ {impact}</p>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">{stat}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl p-6 text-center md:p-8"
            style={{ background: `${BLUE}0d`, border: `1px solid ${BLUE}22` }}>
            <p className="text-lg font-bold text-slate-900 md:text-xl">{l.s2highlight}</p>
            <p className="mt-2 text-sm text-slate-500">{l.s2highlightSub}</p>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════ */}
      <section id="how" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-600">{l.s3label}</p>
          <h2 className="mb-14 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{l.s3title}</h2>

          <div className="relative grid gap-10 md:grid-cols-4">
            <div aria-hidden className="absolute top-8 left-0 right-0 hidden h-px md:block"
              style={{ background: `linear-gradient(90deg, transparent 0%, ${BLUE}30 15%, ${BLUE}30 85%, transparent 100%)`, margin: "0 11%" }}
            />
            {steps.map(({ Icon, num, title, desc }) => (
              <div key={num} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg shadow-brand-100"
                  style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1d4ed8 100%)` }}>
                  <Icon size={24} className="text-white" />
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold shadow"
                    style={{ color: BLUE }}>{num}</span>
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BENEFITS ══════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-600">{l.s4label}</p>
          <h2 className="mb-14 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{l.s4title}</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map(({ Icon, iconCls, title, desc, outcome, badges }) => (
              <div key={title} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-brand-100">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconCls}`}>
                  <Icon size={20} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-500">{desc}</p>
                <div className="mb-4 rounded-lg bg-slate-50 px-4 py-2.5">
                  <p className="text-xs font-semibold text-slate-700">→ {outcome}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span key={b} className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ background: `${BLUE}0d`, color: BLUE }}>{b}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DASHBOARD PREVIEW ═════════════════════════════════════════════ */}
      <section style={{ background: DARK }} className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-400">{l.s5label}</p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">{l.s5title}</h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-slate-400">{l.s5sub}</p>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="mx-auto text-[11px] font-medium text-white/30">AI Call Analytics</span>
            </div>

            <div className="space-y-4 p-4 md:p-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: l.kpi1label, value: "Марія К.", sub: l.kpi1sub, accent: "text-emerald-400" },
                  { label: l.kpi2label, value: "38%",     sub: l.kpi2sub, accent: "text-emerald-400" },
                  { label: l.kpi3label, value: "5",       sub: l.kpi3sub, accent: "text-emerald-400" },
                  { label: l.kpi4label, value: "2:41",    sub: l.kpi4sub, accent: "text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white/5 p-4">
                    <p className="mb-1 text-[10px] text-white/40">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className={`mt-0.5 text-[10px] font-semibold ${s.accent}`}>{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {/* Upsell leaderboard */}
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">{l.upsellTitle}</p>
                  {[
                    { name: "Марія К.",   pct: "67%", w: "67%" },
                    { name: "Іван Д.",    pct: "58%", w: "58%" },
                    { name: "Олена М.",   pct: "31%", w: "31%" },
                    { name: "Андрій Р.", pct: "24%", w: "24%" },
                  ].map((op) => (
                    <div key={op.name} className="mb-2.5 last:mb-0">
                      <div className="mb-1 flex justify-between">
                        <span className="text-[11px] text-white/60">{op.name}</span>
                        <span className="text-[11px] font-bold text-white">{op.pct}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: op.w }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lost order reasons */}
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">{l.lostTitle}</p>
                  {[
                    { reason: l.lost1reason, count: 8, cls: "bg-red-400"    },
                    { reason: l.lost2reason, count: 5, cls: "bg-amber-400"  },
                    { reason: l.lost3reason, count: 4, cls: "bg-orange-400" },
                    { reason: l.lost4reason, count: 2, cls: "bg-purple-400" },
                  ].map((r) => (
                    <div key={r.reason} className="mb-2.5 flex items-center gap-2 last:mb-0">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${r.cls}`} />
                      <span className="flex-1 text-[11px] text-white/60">{r.reason}</span>
                      <span className="text-[11px] font-bold text-white">{r.count}</span>
                    </div>
                  ))}
                </div>

                {/* Sentiment + AI insight */}
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">{l.sentimentTitle}</p>
                    <div className="flex gap-3">
                      {[
                        { label: l.sent1label, pct: "72%", cls: "bg-emerald-400" },
                        { label: l.sent2label, pct: "19%", cls: "bg-slate-500"   },
                        { label: l.sent3label, pct: "9%",  cls: "bg-red-400"     },
                      ].map((s) => (
                        <div key={s.label} className="flex-1 text-center">
                          <p className="mb-1 text-base font-bold text-white">{s.pct}</p>
                          <div className={`h-1.5 w-full rounded-full ${s.cls}`} />
                          <p className="mt-1 text-[9px] text-white/30">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl p-4"
                    style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.20)" }}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">{l.aiInsightLabel}</p>
                    <p className="text-[11px] leading-relaxed text-white/70">{l.aiInsightText}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ INTEGRATIONS ══════════════════════════════════════════════════ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-600">{l.s6label}</p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{l.s6title}</h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-slate-500">{l.s6sub}</p>

          <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
            {["Binotel","Ringostat","KeyCRM","Kyivstar PBX","VoIPTime","Poster POS","iiko","Aircall","Twilio"].map((name) => (
              <div key={name} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm">{name}</div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
            {[
              { label: l.flowCall,     style: { background: `${BLUE}0d`,     color: BLUE,     border: `1px solid ${BLUE}25`     } },
              { label: "→",            style: { color: "#CBD5E1", border: "none", background: "none" }, plain: true },
              { label: l.flowAI,       style: { background: "#7c3aed11",     color: "#7c3aed", border: "1px solid #7c3aed22" } },
              { label: "→",            style: { color: "#CBD5E1", border: "none", background: "none" }, plain: true },
              { label: l.flowDash,     style: { background: "#05966911",     color: "#059669", border: "1px solid #05966922" } },
              { label: "→",            style: { color: "#CBD5E1", border: "none", background: "none" }, plain: true },
              { label: l.flowDecision, style: { background: "#d9770611",     color: "#d97706", border: "1px solid #d9770622" } },
            ].map(({ label, style, plain }, i) =>
              plain
                ? <span key={i} className="text-lg font-bold text-slate-300">{label}</span>
                : <span key={label} className="rounded-xl px-4 py-2" style={style}>{label}</span>
            )}
          </div>
        </div>
      </section>

      {/* ══ ROI ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1d4ed8 100%)` }}>
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-200">{l.s7label}</p>
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">{l.s7title}</h2>

          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div className="space-y-3">
              {[
                { label: l.roi1label, value: l.roi1val },
                { label: l.roi2label, value: l.roi2val },
                { label: l.roi3label, value: l.roi3val },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-xl px-5 py-4" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <span className="text-sm text-brand-100">{label}</span>
                  <span className="text-lg font-bold text-white">{value}</span>
                </div>
              ))}
              <div className="h-px bg-white/20" />
              <div className="flex items-center justify-between rounded-xl px-5 py-4"
                style={{ background: "rgba(255,255,255,0.22)", outline: "2px solid rgba(255,255,255,0.30)" }}>
                <span className="text-sm font-bold text-brand-100">{l.roiTotalLabel}</span>
                <span className="text-2xl font-extrabold text-white">{l.roiTotalVal}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-xl md:p-8">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{l.roiCardH}</p>
              <p className="mb-6 text-2xl font-extrabold text-slate-900">{l.roiCardSub}</p>
              <div className="mb-6 space-y-3">
                {[
                  { label: l.roiDayLabel,   val: l.roiDayVal   },
                  { label: l.roiMonthLabel, val: l.roiMonthVal },
                  { label: l.roiYearLabel,  val: l.roiYearVal  },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between border-b border-slate-100 pb-3 last:border-0">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-bold text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
              <a href="#audit" className="block w-full rounded-xl py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: BLUE }}>{l.roiCta}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CASE STUDY ════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-600">{l.s8label}</p>
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{l.s8title}</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: l.case1val, label: l.case1label, clr: "text-emerald-600", bg: "bg-emerald-50" },
                { val: l.case2val, label: l.case2label, clr: "text-brand-600",    bg: "bg-brand-50"    },
                { val: l.case3val, label: l.case3label, clr: "text-purple-600",  bg: "bg-purple-50"  },
                { val: l.case4val, label: l.case4label, clr: "text-amber-600",   bg: "bg-amber-50"   },
              ].map(({ val, label, clr, bg }) => (
                <div key={label} className={`rounded-2xl ${bg} p-5 text-center`}>
                  <p className={`text-3xl font-extrabold ${clr}`}>{val}</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-center rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mb-4 text-base italic leading-relaxed text-slate-700">
                "{l.testimonialText}"
              </blockquote>
              <div>
                <p className="font-semibold text-slate-900">{l.testimonialName}</p>
                <p className="text-sm text-slate-500">{l.testimonialRole}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-4 text-base font-bold text-slate-900">{l.storyTitle}</h3>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { emoji: l.story1emoji, step: l.story1step, desc: l.story1desc },
                { emoji: l.story2emoji, step: l.story2step, desc: l.story2desc },
                { emoji: l.story3emoji, step: l.story3step, desc: l.story3desc },
              ].map(({ emoji, step, desc }) => (
                <div key={step}>
                  <p className="mb-2 text-3xl">{emoji}</p>
                  <p className="mb-1 text-sm font-bold text-slate-900">{step}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-600">{l.s9label}</p>
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{l.s9title}</h2>
          <div className="rounded-2xl bg-slate-50 px-6 md:px-8">
            {faqs.map((faq) => <FAQItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════════════════ */}
      <section id="audit" style={{ background: DARK }} className="py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-400">{l.s10label}</p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">{l.s10title}</h2>
          <p className="mx-auto mb-10 max-w-md text-center text-slate-400">{l.s10sub}</p>

          <LeadForm l={l} />

          {!isLoggedIn && (
            <p className="mt-8 text-center text-sm text-slate-500">
              {l.haveAccount}{" "}
              <Link href={`/${lang}/auth/signin`} className="font-semibold text-brand-400 transition-colors hover:text-brand-300">{l.signInLink}</Link>
              {" · "}
              <Link href={`/${lang}/auth/register`} className="font-semibold text-brand-400 transition-colors hover:text-brand-300">{l.registerLink}</Link>
            </p>
          )}
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/10 py-8" style={{ background: DARK }}>
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} AI Call Analytics. {l.footerCopy}</p>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href={`/${lang}/auth/signin`}   className="transition-colors hover:text-white">{l.footerLogin}</Link>
              <Link href={`/${lang}/auth/register`} className="transition-colors hover:text-white">{l.footerSignup}</Link>
              <Link href={`/${lang}/api-docs`}      className="transition-colors hover:text-white">{l.footerApi}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
