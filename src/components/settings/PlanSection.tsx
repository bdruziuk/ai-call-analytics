"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, AlertTriangle } from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";

type Settings = typeof ukDict["settings"];
type Props = {
  t: Settings;
  lang: string;
  planId: string;
  minutesUsed: number;
  minutesLimit: number;
  currentPeriodEnd: string;       // ISO string
  hasStripeSubscription: boolean;
  paymentStatus?: "success" | "cancelled" | null;
};

const PLAN_COLORS: Record<string, string> = {
  free:    "#64748b",
  starter: "#0e4a6e",
  growth:  "#1C78AE",
  pro:     "#155f8a",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free", starter: "Starter", growth: "Growth", pro: "Pro",
};

export function PlanSection({
  t,
  lang,
  planId,
  minutesUsed,
  minutesLimit,
  currentPeriodEnd,
  hasStripeSubscription,
  paymentStatus,
}: Props) {
  const router  = useRouter();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [portalLoading,  setPortalLoading]  = useState(false);

  const plan    = PLANS[planId as PlanId] ?? PLANS.free;
  const pct     = minutesLimit > 0 ? Math.min(100, (minutesUsed / minutesLimit) * 100) : 0;
  const isNearLimit = pct >= 80;
  const renewDate   = new Date(currentPeriodEnd).toLocaleDateString(
    lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  async function handleUpgrade(targetPlanId: string) {
    setUpgradeLoading(targetPlanId);
    try {
      const res  = await fetch("/api/payments/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId: targetPlanId, lang }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else if (data.error) alert(data.error);
    } finally {
      setUpgradeLoading(null);
    }
  }

  async function handleManage() {
    setPortalLoading(true);
    try {
      const res  = await fetch("/api/payments/portal", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lang }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  const d = t.plan;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
        {d.sectionTitle}
      </h2>

      {/* Payment result banner */}
      {paymentStatus === "success" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-800">{d.successMessage}</p>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {d.cancelledMessage}
        </p>
      )}

      {/* Current plan chip */}
      <div className="flex items-center gap-3">
        <div
          className="rounded-xl px-4 py-1.5 text-sm font-bold text-white"
          style={{ background: PLAN_COLORS[planId] ?? "#1C78AE" }}
        >
          {PLAN_LABELS[planId] ?? planId}
        </div>
        <span className="text-sm text-slate-500">{d.currentPlan}</span>
      </div>

      {/* Usage bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
          <span>{d.minutesUsed}</span>
          <span className="font-medium">
            {minutesLimit === -1
              ? <span className="text-emerald-600">{d.unlimited}</span>
              : <>{minutesUsed} {d.of} {minutesLimit} {d.minutesSuffix}</>
            }
          </span>
        </div>
        {minutesLimit !== -1 && (
          <>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: isNearLimit ? "#ef4444" : "#1C78AE",
                }}
              />
            </div>
            {isNearLimit && (
              <div className="mt-2 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-700">{d.limitWarning}</p>
              </div>
            )}
          </>
        )}
        <p className="mt-1.5 text-xs text-slate-400">
          {d.renewsOn}: {renewDate}
        </p>
      </div>

      {/* Upgrade buttons — show next plan tiers */}
      <div className="flex flex-wrap gap-2">
        {PLAN_ORDER.filter((p) => p !== planId && p !== "free").map((targetId) => {
          const targetPlan = PLANS[targetId];
          const isHigher   = PLAN_ORDER.indexOf(targetId) > PLAN_ORDER.indexOf(planId as PlanId);
          if (!isHigher) return null;
          return (
            <button
              key={targetId}
              onClick={() => handleUpgrade(targetId)}
              disabled={!!upgradeLoading}
              className="rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ borderColor: "#1C78AE", color: "#1C78AE" }}
            >
              {upgradeLoading === targetId
                ? "…"
                : `${d.upgradeButton} → ${PLAN_LABELS[targetId]} ($${targetPlan.priceUsd}/mo)`}
            </button>
          );
        })}

        {hasStripeSubscription && (
          <button
            onClick={handleManage}
            disabled={portalLoading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {portalLoading ? "…" : d.manageButton}
          </button>
        )}
      </div>

      {/* Feature summary for current plan */}
      <div className="rounded-xl bg-slate-50 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
        <span>✓ {plan.minutesPerMonth === -1 ? d.unlimited : plan.minutesPerMonth.toLocaleString()} min/mo</span>
        {plan.maxManagers !== null
          ? <span>✓ {plan.maxManagers} managers</span>
          : <span>✓ {d.unlimited} managers</span>
        }
        {plan.hasApi        && <span>✓ API</span>}
        {plan.hasWebhooks   && <span>✓ Webhooks</span>}
        {plan.hasDetailedReport && <span>✓ Detailed reports</span>}
        {plan.hasAiCoaching && <span>✓ AI Coaching</span>}
        {plan.hasCrmIntegration && <span>✓ CRM Integration</span>}
        {plan.hasWhiteLabel && <span>✓ White Label</span>}
      </div>
    </section>
  );
}
