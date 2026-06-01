"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Zap } from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";

type Home = typeof ukDict["home"];
type Props = {
  t: Home;
  lang: string;
  currentPlanId?: string;  // passed when user is logged in
  isLoggedIn: boolean;
};

/* ── Plan feature rows (per-plan values) ────────────────────────────────── */

type PlanDef = {
  id: string;
  titleKey: keyof Home;
  subtitleKey: keyof Home;
  priceUah: number;
  priceUsd: number;
  minutes: number;
  callsEst: number;
  unlimited: boolean;
  unlimitedManagers: boolean;
  managers: number | null;
  storageDays: number;
  hasApi: boolean;
  hasWebhooks: boolean;
  hasDetailed: boolean;
  hasCrm: boolean;
  hasTelephony: boolean;
  hasWhiteLabel: boolean;
  highlight: boolean;
};

const PLANS: PlanDef[] = [
  {
    id: "free",
    titleKey: "planFreeTitle",
    subtitleKey: "planFreeSubtitle",
    priceUah: 0, priceUsd: 0,
    minutes: 30, callsEst: 10, unlimited: false,
    managers: 1, unlimitedManagers: false, storageDays: 7,
    hasApi: false, hasWebhooks: false, hasDetailed: false,
    hasCrm: false, hasTelephony: false, hasWhiteLabel: false,
    highlight: false,
  },
  {
    id: "starter",
    titleKey: "planStarterTitle",
    subtitleKey: "planStarterSubtitle",
    priceUah: 990, priceUsd: 24,
    minutes: 300, callsEst: 100, unlimited: false,
    managers: 3, unlimitedManagers: false, storageDays: 365,
    hasApi: false, hasWebhooks: false, hasDetailed: false,
    hasCrm: false, hasTelephony: false, hasWhiteLabel: false,
    highlight: false,
  },
  {
    id: "growth",
    titleKey: "planGrowthTitle",
    subtitleKey: "planGrowthSubtitle",
    priceUah: 2990, priceUsd: 79,
    minutes: 2000, callsEst: 650, unlimited: false,
    managers: 10, unlimitedManagers: false, storageDays: 365,
    hasApi: true, hasWebhooks: true, hasDetailed: true,
    hasCrm: false, hasTelephony: true, hasWhiteLabel: false,
    highlight: true,
  },
  {
    id: "pro",
    titleKey: "planProTitle",
    subtitleKey: "planProSubtitle",
    priceUah: 7900, priceUsd: 199,
    minutes: 0, callsEst: 0, unlimited: true,
    managers: 50, unlimitedManagers: true, storageDays: 365,
    hasApi: true, hasWebhooks: true, hasDetailed: true,
    hasCrm: true, hasTelephony: true, hasWhiteLabel: true,
    highlight: false,
  },
];

function Tick({ ok }: { ok: boolean }) {
  return ok
    ? <Check className="h-4 w-4 text-emerald-500 shrink-0" />
    : <X     className="h-4 w-4 text-slate-300 shrink-0" />;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 flex items-center gap-1">{value}</span>
    </div>
  );
}

export function PricingSection({ t, lang, currentPlanId, isLoggedIn }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(planId: string) {
    if (planId === "free") {
      router.push(`/${lang}/auth/register`);
      return;
    }
    if (!isLoggedIn) {
      router.push(`/${lang}/auth/register`);
      return;
    }
    setLoading(planId);
    try {
      const res  = await fetch("/api/payments/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId, lang }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        {/* Heading */}
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#06142E] md:text-4xl">
            {t.pricingTitle}
          </h2>
          <p className="mt-3 text-slate-500">{t.pricingSubtitle}</p>
        </div>

        {/* Cards grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent   = currentPlanId === plan.id;
            const isHighlight = plan.highlight;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition ${
                  isHighlight
                    ? "border-[#1C78AE] shadow-[0_4px_24px_rgba(28,120,174,0.18)]"
                    : "border-slate-200"
                }`}
              >
                {/* Popular badge */}
                {isHighlight && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white"
                    style={{ background: "#1C78AE" }}
                  >
                    <Zap className="inline-block h-3 w-3 mr-1" />
                    {t.planPopularBadge}
                  </div>
                )}

                {/* Plan name */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-[#06142E]">{t[plan.titleKey] as string}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{t[plan.subtitleKey] as string}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <p className="text-4xl font-extrabold text-[#06142E] leading-none">
                    {plan.priceUah === 0 ? "0" : plan.priceUah.toLocaleString("uk-UA")}
                    <span className="ml-1.5 text-lg font-semibold text-slate-400">
                      грн{t.planMonthly}
                    </span>
                  </p>
                  {plan.priceUah > 0 ? (
                    <p className="mt-1.5 text-sm text-slate-400">
                      {t.planUsd.replace("{n}", plan.priceUsd.toString())}
                    </p>
                  ) : (
                    /* Spacer — same height as the USD line so feature rows align across all cards */
                    <div className="mt-1.5 h-5" />
                  )}
                </div>

                {/* Feature rows */}
                <div className="flex-1 space-y-0 mb-6">
                  <Row
                    label={t.planMinutesLabel}
                    value={
                      plan.unlimited
                        ? <span className="text-emerald-600 font-semibold">{t.planUnlimited}</span>
                        : `${plan.minutes.toLocaleString()} (${t.planCallsEst.replace("{n}", plan.callsEst.toLocaleString())})`
                    }
                  />
                  {plan.managers !== null && (
                    <Row
                      label={t.planManagersLabel}
                      value={
                        plan.unlimitedManagers
                          ? <span className="text-emerald-600 font-semibold">{t.planUnlimited}</span>
                          : plan.managers
                      }
                    />
                  )}
                  <Row
                    label={t.planStorageLabel}
                    value={plan.storageDays === 365
                      ? "1 рік"
                      : `${plan.storageDays} ${t.planDays}`}
                  />
                  <Row label={t.planFeatApi}       value={<Tick ok={plan.hasApi}        />} />
                  <Row label={t.planFeatWebhooks}   value={<Tick ok={plan.hasWebhooks}   />} />
                  <Row label={t.planFeatDetailed}   value={<Tick ok={plan.hasDetailed}   />} />
                  <Row label={t.planFeatTelephony}  value={<Tick ok={plan.hasTelephony}  />} />
                  <Row label={t.planFeatCrm}        value={<Tick ok={plan.hasCrm}        />} />
                  <Row label={t.planFeatWhiteLabel} value={<Tick ok={plan.hasWhiteLabel} />} />
                </div>

                {/* CTA button */}
                <button
                  onClick={() => !isCurrent && handleSelect(plan.id)}
                  disabled={isCurrent || loading === plan.id}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition disabled:opacity-60 ${
                    isCurrent
                      ? "bg-slate-100 text-slate-400 cursor-default"
                      : isHighlight
                      ? "text-white hover:opacity-90"
                      : "border-2 hover:bg-slate-50"
                  }`}
                  style={
                    isHighlight && !isCurrent
                      ? { background: "#1C78AE" }
                      : isHighlight && isCurrent
                      ? {}
                      : { borderColor: "rgba(28,120,174,0.35)", color: "#1C78AE" }
                  }
                >
                  {loading === plan.id
                    ? "…"
                    : isCurrent
                    ? t.planCtaCurrent
                    : plan.priceUah === 0
                    ? t.planCtaFree
                    : isLoggedIn
                    ? t.planCtaUpgrade
                    : t.planCtaPaid}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
