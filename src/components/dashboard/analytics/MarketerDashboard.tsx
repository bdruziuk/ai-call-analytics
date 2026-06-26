"use client";

import {
  Phone, Trash2, TrendingUp, AlertCircle, AlertTriangle,
  CheckCircle2, XCircle, MinusCircle, ExternalLink,
} from "lucide-react";
import { DashboardKpiCard } from "./DashboardKpiCard";
import type { MarketerAnalytics, TrafficSource, JunkLead } from "@/lib/analytics-types";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function RecommendationBadge({ rec }: { rec: TrafficSource["recommendation"] }) {
  const map = {
    scale:           { label: "Масштабувати",      cls: "bg-emerald-100 text-emerald-700" },
    check:           { label: "Перевірити оголош.", cls: "bg-amber-100 text-amber-700"    },
    disable:         { label: "Вимкнути кампанію", cls: "bg-red-100 text-red-600 font-bold" },
    improve_landing: { label: "Покращити посадкову", cls: "bg-brand-100 text-brand-700"   },
  } as const;
  const { label, cls } = map[rec];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs ${cls}`}>{label}</span>;
}

function JunkReasonLabel({ reason }: { reason: JunkLead["reason"] }) {
  const map = {
    wrong_intent:  "Помилкова заявка",
    did_not_apply: "Не залишав заявку",
    accidental:    "Випадковий дзвінок",
    non_target:    "Нецільовий клієнт",
  } as const;
  return <span className="text-xs text-slate-600">{map[reason]}</span>;
}

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

type Props = { data: MarketerAnalytics };

export function MarketerDashboard({ data }: Props) {
  const { kpi, trafficSources, junkLeads, refusalReasons, demandTags, promotionInsights } = data;

  const tagSizes = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl"];

  return (
    <div className="space-y-6">

      {/* Mock data notice */}
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
        <AlertTriangle size={14} className="shrink-0" />
        Дашборд працює на демо-даних. Замініть <code className="mx-1 rounded bg-amber-100 px-1">MOCK_MARKETER</code> у <code className="rounded bg-amber-100 px-1">src/lib/mock-dashboard-analytics.ts</code> на реальні дані.
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardKpiCard
          icon={<Phone size={18} />}
          label="Дзвінки з реклами"
          value={String(kpi.adCalls)}
          description="За поточний тиждень"
          trend={{ value: kpi.adCallsTrend, suffix: " дзв." }}
          accentColor="brand"
        />
        <DashboardKpiCard
          icon={<Trash2 size={18} />}
          label="Junk Lead Rate"
          value={`${kpi.junkLeadRate}%`}
          description="Сміттєві / нецільові дзвінки"
          trend={{ value: kpi.junkLeadTrend, invertPolarity: true }}
          accentColor="amber"
        />
        <DashboardKpiCard
          icon={<TrendingUp size={18} />}
          label="Конверсія реклами"
          value={`${kpi.adConversionRate}%`}
          description="Рекламні дзвінки → замовлення"
          trend={{ value: kpi.adConversionTrend }}
          accentColor="green"
        />
        <DashboardKpiCard
          icon={<AlertCircle size={18} />}
          label="Топ причина відмови"
          value={kpi.topRefusalReason}
          description="Найчастіша причина незакритої угоди"
          accentColor="red"
        />
      </div>

      {/* ── Traffic source table ── */}
      <Section title="📊 Ефективність джерел трафіку">
        {/* Mobile + tablet portrait cards */}
        <div className="lg:hidden divide-y divide-slate-100">
          {trafficSources.map((src) => (
            <div key={src.id} className="px-4 py-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{src.source}</p>
                  <p className="text-xs text-slate-400">{src.campaign}</p>
                </div>
                <RecommendationBadge rec={src.recommendation} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>Дзвінки: <strong>{src.calls}</strong></span>
                <span>Замовлення: <strong>{src.orders}</strong></span>
                <span>Конверсія: <strong>{src.conversionRate}%</strong></span>
                <span>Junk: <strong className={src.junkLeadRate > 30 ? "text-red-500" : ""}>{src.junkLeadRate}%</strong></span>
                <span className="col-span-2">Дохід: <strong className="text-emerald-600">₴{src.estimatedRevenue.toLocaleString()}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Джерело", "Кампанія", "Дзвінки", "Замовлення", "Конверсія", "Junk %", "Дохід ₴", "Рекомендація"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trafficSources.map((src) => (
                <tr key={src.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{src.source}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{src.campaign}</td>
                  <td className="px-4 py-3 text-slate-600">{src.calls}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{src.orders}</td>
                  <td className="px-4 py-3">
                    <span className={src.conversionRate >= 35 ? "text-emerald-600 font-semibold" : src.conversionRate >= 20 ? "text-amber-600" : "text-red-500 font-semibold"}>
                      {src.conversionRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={src.junkLeadRate > 30 ? "text-red-500 font-bold" : src.junkLeadRate > 15 ? "text-amber-600" : "text-emerald-600"}>
                      {src.junkLeadRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">₴{src.estimatedRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3"><RecommendationBadge rec={src.recommendation} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 2-col row: junk leads + refusal reasons ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Junk leads */}
        <Section title="🗑 Сміттєві ліди">
          <div className="px-5 py-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="text-3xl font-extrabold text-red-500">{kpi.junkLeadRate}%</div>
              <p className="text-xs text-slate-500 leading-relaxed">від усіх рекламних дзвінків є нецільовими або випадковими</p>
            </div>
            <div className="space-y-2.5">
              {junkLeads.map((j) => (
                <div key={j.id} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <XCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="font-mono text-xs text-slate-700">{j.phone}</span>
                      <span className="text-[10px] text-slate-400">{j.date}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">{j.source} · {j.campaign}</p>
                    <JunkReasonLabel reason={j.reason} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Refusal reasons */}
        <Section title="❌ Причини відмов">
          <div className="px-5 py-4 space-y-3">
            {refusalReasons.map((r) => (
              <div key={r.reason}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-700">{r.reason}</span>
                  <span className="font-semibold text-slate-900">{r.count} · {r.percentage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-red-400 transition-all duration-500"
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── 2-col row: demand tags + promotions ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Demand tags cloud */}
        <Section title="☁️ Хмара запитів — що шукають клієнти">
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {demandTags.map((tag) => (
              <span
                key={tag.tag}
                className={`${tagSizes[Math.max(0, tag.weight - 1)]} inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 font-medium text-brand-700`}
              >
                {tag.tag}
                <span className="ml-1 text-[10px] font-normal text-brand-400">{tag.count}</span>
              </span>
            ))}
          </div>
        </Section>

        {/* Promotion insights */}
        <Section title="🎁 Акції та новинки">
          <div className="divide-y divide-slate-100">
            {promotionInsights.map((promo) => {
              const gap = promo.customerMentionRate - promo.operatorMentionRate;
              return (
                <div key={promo.name} className="px-5 py-4">
                  <p className="mb-3 text-sm font-semibold text-slate-900">{promo.name}</p>
                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>Клієнти згадують</span>
                        <span className="font-semibold text-slate-700">{promo.customerMentionRate}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-400" style={{ width: `${promo.customerMentionRate}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>Оператори просувають</span>
                        <span className={`font-semibold ${promo.operatorMentionRate < promo.customerMentionRate ? "text-amber-600" : "text-emerald-600"}`}>
                          {promo.operatorMentionRate}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${promo.operatorMentionRate < promo.customerMentionRate ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${promo.operatorMentionRate}%` }}
                        />
                      </div>
                    </div>
                    {gap > 10 && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                        <AlertCircle size={11} className="shrink-0" />
                        Оператори просувають акцію на {gap}% рідше ніж клієнти про неї питають
                      </p>
                    )}
                    {promo.operatorMentionRate > promo.customerMentionRate && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700">
                        <CheckCircle2 size={11} className="shrink-0" />
                        Оператори активно просувають акцію
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}
