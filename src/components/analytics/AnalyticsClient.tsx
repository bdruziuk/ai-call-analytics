"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
  PieChart, Pie, Cell,
  Legend,
} from "recharts";
import { Sparkles, TrendingUp, Users, PhoneCall, Target, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

/* ── Data types (mirror what page.tsx produces) ─────────────────────────── */

export type AnalyticsData = {
  dateFrom: string;
  dateTo: string;
  totalCalls: number;
  avgScore: number | null;
  sold: number;
  notSold: number;
  potential: number;
  topIssues:     { issue: string; count: number }[];
  topMistakes:   { mistake: string; count: number }[];
  topObjections: { objection: string; count: number }[];
  topProducts:   { product: string; count: number }[];
  managers: {
    name: string;
    totalCalls: number;
    avgScore: number | null;
    conversionRate: number | null;
    topIssues: string[];
    topMistakes: string[];
  }[];
  scoreTrend: { month: string; avgScore: number; count: number }[];
};

type AIReport = {
  summary: string;
  teamRecommendations: string[];
  managerCoaching: { managerName: string; points: string[] }[];
  objectionHandling: string[];
  processImprovements: string[];
};

type Props = {
  t: Dictionary;
  lang: string;
  data: AnalyticsData | null;
  periodFrom?: string;   // YYYY-MM-DD, from URL
  periodTo?:   string;
  viewAs?: string;
};

/* ── Palette ─────────────────────────────────────────────────────────────── */

const BRAND   = "#1C78AE";
const EMERALD = "#10b981";
const AMBER   = "#f59e0b";
const RED     = "#ef4444";

/* ── Date helpers ────────────────────────────────────────────────────────── */

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/* ── Period selector ─────────────────────────────────────────────────────── */

type PeriodSelectorProps = { viewAs?: string;
  ta: Dictionary["analytics"];
  lang: string;
  currentFrom?: string;
  currentTo?: string;
};

function PeriodSelector({ ta, lang, currentFrom, currentTo, viewAs }: PeriodSelectorProps) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(currentFrom ?? "");
  const [customTo,   setCustomTo]   = useState(currentTo   ?? "");

  const navigate = useCallback((from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from)   q.set("from",   from);
    if (to)     q.set("to",     to);
    if (viewAs) q.set("viewAs", viewAs);
    router.push(`/${lang}/analytics${q.size ? `?${q}` : ""}`);
  }, [router, lang, viewAs]);

  const presets = [
    { label: ta.periodAll,    from: undefined,        to: undefined        },
    { label: ta.periodToday,  from: isoToday(),       to: isoToday()       },
    { label: ta.period3days,  from: isoDaysAgo(2),    to: isoToday()       },
    { label: ta.periodWeek,   from: isoDaysAgo(6),    to: isoToday()       },
    { label: ta.periodMonth,  from: isoDaysAgo(29),   to: isoToday()       },
  ];

  function isActive(from?: string, to?: string) {
    return (from ?? "") === (currentFrom ?? "") && (to ?? "") === (currentTo ?? "");
  }

  function applyCustom() {
    if (customFrom || customTo) navigate(customFrom || undefined, customTo || undefined);
  }

  return (
    <div className="space-y-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => navigate(p.from, p.to)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isActive(p.from, p.to)
                ? "border-brand-500 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range — full row on mobile */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="text-xs text-slate-400">{ta.periodFrom}</span>
        <input
          type="date"
          value={customFrom}
          max={customTo || isoToday()}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <span className="text-xs text-slate-400">{ta.periodTo}</span>
        <input
          type="date"
          value={customTo}
          min={customFrom}
          max={isoToday()}
          onChange={(e) => setCustomTo(e.target.value)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          onClick={applyCustom}
          disabled={!customFrom && !customTo}
          className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-40"
        >
          {ta.periodApply}
        </button>
      </div>
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-[#0B344E]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */

function ChartCard({ title, children, className = "" }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

/* ── AI report section ───────────────────────────────────────────────────── */

type BlockProps = {
  id: string;
  title: string;
  items: string[];
  highlight?: boolean;
  expanded: string | null;
  onToggle: (id: string) => void;
};

function Block({ id, title, items, highlight, expanded, onToggle }: BlockProps) {
  const open = expanded === id;
  return (
    <div className={`rounded-xl border ${highlight ? "border-brand-200 bg-brand-50" : "border-slate-100 bg-slate-50"}`}>
      <button
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className={`text-sm font-semibold ${highlight ? "text-brand-800" : "text-slate-700"}`}>{title}</span>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {open && (
        <ul className="space-y-2 px-4 pb-4">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className={`mt-0.5 shrink-0 font-bold ${highlight ? "text-brand-500" : "text-slate-400"}`}>{i + 1}.</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AISection({ report, t }: { report: AIReport; t: Dictionary["analytics"] }) {
  const [expanded, setExpanded] = useState<string | null>("summary");
  const handleToggle = useCallback(
    (id: string) => setExpanded((prev) => (prev === id ? null : id)),
    [],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-brand-500" />
        <h2 className="text-base font-bold text-brand-900">{t.aiReportTitle}</h2>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
        <p className="text-sm font-semibold text-brand-700 mb-1">{t.aiSummary}</p>
        <p className="text-sm text-slate-700 leading-relaxed">{report.summary}</p>
      </div>

      <Block id="team"    title={t.teamRecs}            items={report.teamRecommendations} highlight expanded={expanded} onToggle={handleToggle} />
      <Block id="process" title={t.processImprovements} items={report.processImprovements}          expanded={expanded} onToggle={handleToggle} />
      <Block id="obj"     title={t.objectionHandling}   items={report.objectionHandling}            expanded={expanded} onToggle={handleToggle} />

      {/* Manager coaching */}
      {report.managerCoaching?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-600">{t.managerCoaching}</p>
          <div className="space-y-2">
            {report.managerCoaching.map((mc, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-800">{mc.managerName}</p>
                <ul className="space-y-1">
                  {mc.points.map((pt, j) => (
                    <li key={j} className="flex gap-2 text-xs text-slate-600">
                      <span className="text-amber-500 font-bold shrink-0">→</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function AnalyticsClient({ t, lang, data, periodFrom, periodTo, viewAs }: Props) {
  const ta = t.analytics;
  const [aiReport, setAiReport]     = useState<AIReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError]       = useState<string | null>(null);

  async function handleGenerate() {
    if (!data) return;
    setGenerating(true);
    setAiError(null);
    try {
      const res  = await fetch("/api/analytics/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ data, lang }),
      });
      if (!res.ok) throw new Error();
      const report: AIReport = await res.json();
      setAiReport(report);
    } catch {
      setAiError(ta.errorGenerating);
    } finally {
      setGenerating(false);
    }
  }

  /* ── Empty state ── */
  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-12 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0B344E]">{ta.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{ta.subtitle}</p>
        </div>
        <PeriodSelector ta={ta} lang={lang} currentFrom={periodFrom} currentTo={periodTo} viewAs={viewAs} />
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
            <TrendingUp size={28} className="text-brand-400" />
          </div>
          <p className="text-slate-600 font-medium">{ta.noData}</p>
          <p className="text-sm text-slate-400">{ta.noDataHint}</p>
        </div>
      </main>
    );
  }

  /* ── Derived display values ── */
  const withSaleStatus = data.sold + data.notSold + data.potential;
  const convRate = withSaleStatus > 0
    ? Math.round((data.sold / withSaleStatus) * 100)
    : null;

  const saleDistData = [
    { name: ta.sold,     value: data.sold,      color: EMERALD },
    { name: ta.notSold,  value: data.notSold,   color: RED     },
    { name: ta.potential,value: data.potential,  color: AMBER   },
  ].filter((d) => d.value > 0);

  const managerChartData = data.managers
    .filter((m) => m.avgScore !== null)
    .map((m) => ({ name: m.name, score: m.avgScore, calls: m.totalCalls }));


  /* ── Layout ── */
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B344E]">{ta.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{ta.subtitle}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {periodFrom || periodTo
              ? `${periodFrom ?? "…"} → ${periodTo ?? "…"}`
              : `${data.dateFrom} → ${data.dateTo}`}
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="self-start flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-60 sm:self-auto"
        >
          {generating
            ? <><Loader2 size={15} className="animate-spin" />{ta.generating}</>
            : <><Sparkles size={15} />{ta.generateReport}</>
          }
        </button>
      </div>

      {/* Period selector */}
      <PeriodSelector ta={ta} lang={lang} currentFrom={periodFrom} currentTo={periodTo} viewAs={viewAs} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<PhoneCall size={15} />}
          label={ta.totalCalls}
          value={data.totalCalls}
          sub={`${data.dateFrom} → ${data.dateTo}`}
        />
        <StatCard
          icon={<TrendingUp size={15} />}
          label={ta.avgScore}
          value={data.avgScore !== null ? `${data.avgScore}${ta.scoreUnit}` : "—"}
        />
        <StatCard
          icon={<Target size={15} />}
          label={ta.conversionRate}
          value={convRate !== null ? `${convRate}%` : "—"}
          sub={`${data.sold} / ${withSaleStatus} ${ta.callsUnit}`}
        />
        <StatCard
          icon={<Users size={15} />}
          label={ta.totalManagers}
          value={data.managers.length}
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Sale distribution */}
        <ChartCard title={ta.saleDistTitle}>
          {saleDistData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={saleDistData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {saleDistData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value) => {
                    const v     = value as number;
                    const total = saleDistData.reduce((s, d) => s + d.value, 0);
                    const pct   = total > 0 ? Math.round((v / total) * 100) : 0;
                    return [`${v} (${pct}%)`];
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                  formatter={(value, entry) => {
                    const total = saleDistData.reduce((s, d) => s + d.value, 0);
                    const v     = (entry as unknown as { payload?: { value: number } }).payload?.value ?? 0;
                    const pct   = total > 0 ? Math.round((v / total) * 100) : 0;
                    return `${String(value)} — ${v} (${pct}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
              — no sale data —
            </div>
          )}
        </ChartCard>

        {/* Manager comparison */}
        <ChartCard title={ta.managerChartTitle}>
          {managerChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={managerChartData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value, name) => [
                    name === "score" ? `${value}/10` : `${value} ${ta.callsUnit}`,
                    name === "score" ? ta.avgScore : ta.totalCalls,
                  ]}
                />
                <Bar dataKey="score" fill={BRAND} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
              — no manager data —
            </div>
          )}
        </ChartCard>

        {/* Top issues — CSS list avoids SVG label clipping */}
        <ChartCard title={ta.topIssuesTitle} className="lg:col-span-2">
          {data.topIssues.length > 0 ? (
            <div className="space-y-3">
              {data.topIssues.slice(0, 6).map((item, i) => {
                const maxCount = data.topIssues[0].count;
                const pct      = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <span className="text-xs leading-snug text-slate-600">{item.issue}</span>
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-red-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
              — no issue data —
            </div>
          )}
        </ChartCard>
      </div>

      {/* AI error */}
      {aiError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {aiError}
        </p>
      )}

      {/* AI report */}
      {aiReport && <AISection report={aiReport} t={ta} />}
    </main>
  );
}
