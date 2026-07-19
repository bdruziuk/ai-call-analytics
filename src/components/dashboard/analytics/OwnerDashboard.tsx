"use client";

import Link from "next/link";
import {
  TrendingDown, TrendingUp, AlertTriangle, ShoppingCart,
  Clock, Zap, Users, PhoneOff, Package, Brain, Trophy,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { DashboardKpiCard } from "./DashboardKpiCard";
import type { OwnerAnalytics, OperatorKpi } from "@/lib/analytics-types";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtAht(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StatusBadge({ status, t }: { status: OperatorKpi["status"]; t: Dictionary["dashboard"]["owner"]["status"] }) {
  const map = {
    good:      { label: t.good,      cls: "bg-emerald-100 text-emerald-700" },
    attention: { label: t.attention, cls: "bg-amber-100 text-amber-700"    },
    critical:  { label: t.critical,  cls: "bg-red-100 text-red-600 font-bold" },
  } as const;
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs ${cls}`}>{label}</span>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="border-b border-slate-100 bg-brand-50 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-800">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

type Props = { data: OwnerAnalytics; lang: string; t: Dictionary };

export function OwnerDashboard({ data, lang, t }: Props) {
  const { kpi, lostRevenueByDay, operators, criticalCalls, topProducts } = data;
  const td = t.dashboard;
  const to = td.owner;

  const BRAND = "#1C78AE";

  return (
    <div className="space-y-6">

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardKpiCard
          icon={<TrendingDown size={18} />}
          label={to.kpi.lostRevenue}
          value={`₴${kpi.lostRevenue.toLocaleString()}`}
          description={to.kpi.lostRevenueDesc}
          trend={{ value: kpi.lostRevenueTrend, invertPolarity: true }}
          trendVs={td.trendVs}
          accentColor="red"
        />
        <DashboardKpiCard
          icon={<ShoppingCart size={18} />}
          label={to.kpi.conversionRate}
          value={`${kpi.conversionRate}%`}
          description={to.kpi.conversionDesc}
          trend={{ value: kpi.conversionTrend }}
          trendVs={td.trendVs}
          accentColor="green"
        />
        <DashboardKpiCard
          icon={<TrendingUp size={18} />}
          label={to.kpi.upsellRate}
          value={`${kpi.upsellRate}%`}
          description={to.kpi.upsellDesc}
          trend={{ value: kpi.upsellTrend }}
          trendVs={td.trendVs}
          accentColor="brand"
        />
        <DashboardKpiCard
          icon={<AlertTriangle size={18} />}
          label={to.kpi.criticalCalls}
          value={String(kpi.criticalCallsCount)}
          description={to.kpi.criticalDesc}
          trend={{ value: kpi.criticalCallsTrend, invertPolarity: true, suffix: to.kpi.callsSuffix }}
          trendVs={td.trendVs}
          accentColor="amber"
        />
      </div>

      {/* ── Lost revenue chart ── */}
      <Section title={to.lostRevenueTitle}>
        <div className="px-4 py-4 md:px-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={lostRevenueByDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v) => [`₴${Number(v).toLocaleString()}`, to.chartTooltipLost]}
              />
              <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── Operator KPI table ── */}
      <Section title={to.operatorKpiTitle}>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {operators.map((op) => (
            <div key={op.id} className="px-4 py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{op.name}</span>
                <StatusBadge status={op.status} t={to.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>{to.operatorCols.conversion}: <strong>{op.conversionRate}%</strong></span>
                <span>{to.operatorCols.aht}: <strong>{fmtAht(op.aht)}</strong></span>
                <span>{to.operatorCols.upsell}: <strong>{op.upsellRate}%</strong></span>
                <span>{to.operatorCols.checksPerHour}: <strong>{op.closedChecksPerHour}</strong></span>
                <span>{to.operatorCols.wasteTime}: <strong>{op.wasteTimeRatio}%</strong></span>
                <span>{to.operatorCols.politeness}: <strong>{op.politenessScore}/10</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                {[to.operatorCols.operator, to.operatorCols.conversion, to.operatorCols.aht, to.operatorCols.upsell, to.operatorCols.checksPerHour, to.operatorCols.wasteTime, to.operatorCols.politeness, to.operatorCols.status].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operators.map((op) => (
                <tr key={op.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{op.name}</td>
                  <td className="px-4 py-3">
                    <span className={op.conversionRate >= 65 ? "text-emerald-600 font-semibold" : op.conversionRate >= 50 ? "text-amber-600" : "text-red-500 font-semibold"}>
                      {op.conversionRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{fmtAht(op.aht)}</td>
                  <td className="px-4 py-3">
                    <span className={op.upsellRate >= 50 ? "text-emerald-600 font-semibold" : op.upsellRate >= 30 ? "text-amber-600" : "text-red-500 font-semibold"}>
                      {op.upsellRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{op.closedChecksPerHour}</td>
                  <td className="px-4 py-3">
                    <span className={op.wasteTimeRatio <= 15 ? "text-emerald-600" : op.wasteTimeRatio <= 30 ? "text-amber-600 font-semibold" : "text-red-500 font-semibold"}>
                      {op.wasteTimeRatio}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${op.politenessScore >= 8 ? "bg-emerald-400" : op.politenessScore >= 6.5 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${op.politenessScore * 10}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{op.politenessScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={op.status} t={to.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Top products (from call analytics) ── */}
      <Section title={to.topProductsTitle}>
        {topProducts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">{to.noProducts}</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {topProducts.map((p, i) => (
                <div key={p.product} className="px-4 py-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-xs font-bold text-slate-400">#{i + 1}</span>
                      <span className="truncate font-semibold text-slate-900">{p.product}</span>
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      <Trophy size={14} className="text-amber-500" />
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>{to.topProductsCols.calls}: <strong>{p.callCount}</strong></span>
                    <span>{to.topProductsCols.sold}: <strong>{p.soldCount}</strong></span>
                    <span>{to.topProductsCols.conversion}: <strong>{p.conversionRate}%</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">#</th>
                    {[to.topProductsCols.product, to.topProductsCols.calls, to.topProductsCols.sold, to.topProductsCols.conversion].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProducts.map((p, i) => (
                    <tr key={p.product} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-slate-400">
                        {i === 0 ? <Trophy size={16} className="text-amber-500" /> : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.product}</td>
                      <td className="px-4 py-3 text-slate-600">{p.callCount}</td>
                      <td className="px-4 py-3 text-slate-600">{p.soldCount}</td>
                      <td className="px-4 py-3">
                        <span className={p.conversionRate >= 65 ? "text-emerald-600 font-semibold" : p.conversionRate >= 50 ? "text-amber-600" : "text-red-500 font-semibold"}>
                          {p.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* ── Operational insight cards ── */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{to.insightsTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              Icon: PhoneOff,
              color: "bg-red-100 text-red-600",
              title: to.insight1Title,
              value: "14",
              desc: to.insight1Desc,
              loss: to.insight1Loss,
            },
            {
              Icon: Package,
              color: "bg-orange-100 text-orange-600",
              title: to.insight2Title,
              value: "8",
              desc: to.insight2Desc,
              loss: to.insight2Loss,
            },
            {
              Icon: Zap,
              color: "bg-amber-100 text-amber-700",
              title: to.insight3Title,
              value: "22%",
              desc: to.insight3Desc,
              loss: undefined,
            },
            {
              Icon: Brain,
              color: "bg-purple-100 text-purple-600",
              title: to.insight4Title,
              value: "2",
              desc: to.insight4Desc,
              loss: undefined,
            },
          ].map(({ Icon, color, title, value, desc, loss }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={17} />
                </span>
                <span className="text-2xl font-extrabold text-slate-900">{value}</span>
              </div>
              <p className="mb-1 text-sm font-semibold text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              {loss && (
                <p className="mt-2 text-xs font-bold text-red-500">{to.estimatedLoss} {loss}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Critical calls list ── */}
      <Section title={to.criticalCallsTitle}>
        {criticalCalls.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">{to.noCriticalCalls}</p>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {criticalCalls.map((c) => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">{c.datetime}</p>
                      <p className="text-sm font-semibold text-slate-800">{c.operator}</p>
                      <p className="mt-0.5 text-xs text-red-600">{c.reason}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-red-500">−₴{c.estimatedLoss}</span>
                  </div>
                  {c.callId && (
                    <Link href={`/${lang}/calls/${c.callId}`} className="mt-1.5 inline-block text-xs font-medium text-brand-600 hover:underline">
                      {to.openCallMobile}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {[to.criticalCols.datetime, to.criticalCols.operator, to.criticalCols.reason, to.criticalCols.loss, ""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {criticalCalls.map((c) => (
                    <tr key={c.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{c.datetime}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{c.operator}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          {c.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-red-500">−₴{c.estimatedLoss}</td>
                      <td className="px-4 py-3 text-right">
                        {c.callId ? (
                          <Link href={`/${lang}/calls/${c.callId}`} className="text-xs font-medium text-brand-600 hover:underline">
                            {to.openCallDesktop}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
