"use client";

import Link from "next/link";
import {
  TrendingDown, TrendingUp, AlertTriangle, ShoppingCart,
  Clock, Zap, Users, PhoneOff, Package, Brain,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { DashboardKpiCard } from "./DashboardKpiCard";
import type { OwnerAnalytics, OperatorKpi } from "@/lib/analytics-types";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtAht(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: OperatorKpi["status"] }) {
  const map = {
    good:      { label: "Добре",             cls: "bg-emerald-100 text-emerald-700" },
    attention: { label: "Потребує уваги",    cls: "bg-amber-100 text-amber-700"    },
    critical:  { label: "Критично",          cls: "bg-red-100 text-red-600 font-bold" },
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

type Props = { data: OwnerAnalytics; lang: string };

export function OwnerDashboard({ data, lang }: Props) {
  const { kpi, lostRevenueByDay, operators, criticalCalls } = data;

  const BRAND = "#1C78AE";

  return (
    <div className="space-y-6">

      {/* ── Mock data notice ── */}
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
        <AlertTriangle size={14} className="shrink-0" />
        Дашборд працює на демо-даних. Замініть <code className="mx-1 rounded bg-amber-100 px-1">MOCK_OWNER</code> у <code className="rounded bg-amber-100 px-1">src/lib/mock-dashboard-analytics.ts</code> на реальні дані з Prisma.
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardKpiCard
          icon={<TrendingDown size={18} />}
          label="Злитий прибуток"
          value={`₴${kpi.lostRevenue.toLocaleString()}`}
          description="Оцінка втрат через помилки операторів"
          trend={{ value: kpi.lostRevenueTrend, invertPolarity: true }}
          accentColor="red"
        />
        <DashboardKpiCard
          icon={<ShoppingCart size={18} />}
          label="Конверсія в чеки"
          value={`${kpi.conversionRate}%`}
          description="Відповілих дзвінків → замовлення"
          trend={{ value: kpi.conversionTrend }}
          accentColor="green"
        />
        <DashboardKpiCard
          icon={<TrendingUp size={18} />}
          label="Виконання апсейлу"
          value={`${kpi.upsellRate}%`}
          description="Дзвінків із пропозицією доп. товарів"
          trend={{ value: kpi.upsellTrend }}
          accentColor="brand"
        />
        <DashboardKpiCard
          icon={<AlertTriangle size={18} />}
          label="Критичні помилки"
          value={String(kpi.criticalCallsCount)}
          description="Конфлікти, грубість, довге очікування"
          trend={{ value: kpi.criticalCallsTrend, invertPolarity: true, suffix: " дзв." }}
          accentColor="amber"
        />
      </div>

      {/* ── Lost revenue chart ── */}
      <Section title="📉 Злитий прибуток по днях (₴)">
        <div className="px-4 py-4 md:px-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={lostRevenueByDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v) => [`₴${Number(v).toLocaleString()}`, "Злито"]}
              />
              <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── Operator KPI table ── */}
      <Section title="👥 KPI операторів">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {operators.map((op) => (
            <div key={op.id} className="px-4 py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{op.name}</span>
                <StatusBadge status={op.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>Конверсія: <strong>{op.conversionRate}%</strong></span>
                <span>AHT: <strong>{fmtAht(op.aht)}</strong></span>
                <span>Апсейл: <strong>{op.upsellRate}%</strong></span>
                <span>Чеки/год: <strong>{op.closedChecksPerHour}</strong></span>
                <span>Waste: <strong>{op.wasteTimeRatio}%</strong></span>
                <span>Ввічливість: <strong>{op.politenessScore}/10</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                {["Оператор", "Конверсія", "AHT", "Апсейл", "Чеки/год", "Waste Time", "Ввічливість", "Статус"].map((h) => (
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
                  <td className="px-4 py-3"><StatusBadge status={op.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Operational insight cards ── */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Операційні інсайти</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              Icon: PhoneOff,
              color: "bg-red-100 text-red-600",
              title: "Дзвінок без альтернативи",
              value: "14",
              desc: "Оператор не запропонував заміну коли товар закінчився",
              loss: "₴2 940",
            },
            {
              Icon: Package,
              color: "bg-orange-100 text-orange-600",
              title: "Out-of-stock leaks",
              value: "8",
              desc: "Втрати через відсутність позиції та ненадання альтернативи",
              loss: "₴1 680",
            },
            {
              Icon: Zap,
              color: "bg-amber-100 text-amber-700",
              title: "Waste Time Ratio",
              value: "22%",
              desc: "Частка часу операторів витрачена на нецільові / мертві ліди",
              loss: undefined,
            },
            {
              Icon: Brain,
              color: "bg-purple-100 text-purple-600",
              title: "Емоційне вигорання",
              value: "2 опер.",
              desc: "Монотонна / роботизована мова, низька залученість у дзвінку",
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
                <p className="mt-2 text-xs font-bold text-red-500">Оцін. збиток: {loss}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Critical calls list ── */}
      <Section title="🚨 Критичні дзвінки — потребують уваги">
        {criticalCalls.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Критичних дзвінків немає — відмінно!</p>
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
                      Відкрити дзвінок →
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
                    {["Дата / час", "Оператор", "Причина", "Оцін. збиток", ""].map((h) => (
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
                            Дзвінок →
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
