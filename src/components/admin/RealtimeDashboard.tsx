"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, WifiOff, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Dot,
} from "recharts";

/* ── Types ── */
type CallEntry = {
  id: string;
  fileName: string;
  source: string;
  status: string;
  reportType: string;
  durationSeconds: number | null;
  score: number | null;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
};

type Stats = {
  totalUsers: number;
  totalCalls: number;
  totalMinutes: number;
  minutesToday: number;
  activeNow: number;
  callsToday: number;
  totalApiCalls: number;
  apiCallsToday: number;
};

type DayPoint  = { hour: number; label: string; count: number; api: number };
type TodayTimestamps = { calls: string[]; api: string[] };

type ApiLogEntry = {
  id: string;
  endpoint: string;
  status: string;
  statusCode: number;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
};

/* ── Source meta ── */
const SOURCE_META: Record<string, { label: string; emoji: string; cls: string }> = {
  manual:    { label: "Manual",    emoji: "⬆️", cls: "bg-slate-100 text-slate-600" },
  binotel:   { label: "Binotel",   emoji: "📞", cls: "bg-blue-50 text-blue-700" },
  ringostat: { label: "Ringostat", emoji: "📡", cls: "bg-indigo-50 text-indigo-700" },
  voiptime:  { label: "VoIPTime",  emoji: "☁️", cls: "bg-sky-50 text-sky-700" },
  kyivstar:  { label: "Kyivstar",  emoji: "🌐", cls: "bg-purple-50 text-purple-700" },
  twilio:    { label: "Twilio",    emoji: "🔴", cls: "bg-red-50 text-red-700" },
  aircall:   { label: "Aircall",   emoji: "✈️", cls: "bg-teal-50 text-teal-700" },
  api:       { label: "API",       emoji: "⚡", cls: "bg-amber-50 text-amber-700" },
};

const STATUS_CLS: Record<string, string> = {
  queued:       "bg-slate-100 text-slate-600",
  transcribing: "bg-brand-100 text-brand-700",
  analyzing:    "bg-brand-100 text-brand-700",
  completed:    "bg-emerald-100 text-emerald-700",
  failed:       "bg-red-100 text-red-700",
  uploaded:     "bg-slate-100 text-slate-500",
};

const REPORT_LABELS: Record<string, string> = {
  high_level: "Quick",
  medium:     "Standard",
  detailed:   "Detailed",
};

function SourceBadge({ source }: { source: string }) {
  const m = SOURCE_META[source] ?? { label: source, emoji: "🔗", cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${m.cls}`}>
      <span>{m.emoji}</span>
      {m.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const pulse = status === "transcribing" || status === "analyzing" || status === "queued";
  const color =
    status === "completed" ? "bg-emerald-400" :
    status === "failed"    ? "bg-red-400" :
    status === "queued"    ? "bg-slate-300" :
    "bg-brand-400";
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${color} ${pulse ? "animate-pulse" : ""}`} />
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmtDuration(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const PAGE_SIZE = 8;

function Paginator({
  page, total, pageSize, onChange,
}: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5 shrink-0">
      <span className="text-[10px] text-slate-400">{from}–{to} of {total}</span>
      <div className="flex items-center gap-0.5">
        <PagBtn onClick={() => onChange(1)}       disabled={page === 1}     label="«" />
        <PagBtn onClick={() => onChange(page - 1)} disabled={page === 1}     label="‹" />
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
          .reduce<(number | "…")[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-0.5 text-[10px] text-slate-300">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`min-w-[22px] rounded px-1 py-0.5 text-[10px] font-medium transition-colors ${
                  p === page ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}
        <PagBtn onClick={() => onChange(page + 1)} disabled={page === pages} label="›" />
        <PagBtn onClick={() => onChange(pages)}    disabled={page === pages} label="»" />
      </div>
    </div>
  );
}

function PagBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded px-1 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default"
    >
      {label}
    </button>
  );
}

/* ── Panel shell ── */
function Panel({ title, sub, right, children, className = "" }: {
  title: string; sub?: string; right?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 shrink-0">
        <h2 className="text-xs font-semibold text-slate-700">
          {title}
          {sub && <span className="ml-1.5 font-normal text-slate-400">{sub}</span>}
        </h2>
        {right && <div className="text-[10px] text-slate-400">{right}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Main component ── */
export function RealtimeDashboard({ lang }: { lang: string }) {
  const [calls, setCalls]                   = useState<CallEntry[]>([]);
  const [stats, setStats]                   = useState<Stats | null>(null);
  const [todayTimestamps, setTodayTimestamps] = useState<TodayTimestamps>({ calls: [], api: [] });
  const [apiLogs, setApiLogs]         = useState<ApiLogEntry[]>([]);
  const [callsPage, setCallsPage]     = useState(1);
  const [apiPage, setApiPage]         = useState(1);
  const [connected, setConnected]     = useState(false);
  const [lastUpdate, setLastUpdate]   = useState<Date | null>(null);
  const [newIds, setNewIds]           = useState<Set<string>>(new Set());
  const prevIds                       = useRef<Set<string>>(new Set());
  const [tick, setTick]               = useState(0);
  const [filterEmail, setFilterEmail] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let es: EventSource;
    function connect() {
      es = new EventSource("/api/admin/realtime");
      es.onmessage = (e) => {
        const { calls: incoming, stats: s, todayTimestamps: tt, apiLogs: al } = JSON.parse(e.data) as {
          calls: CallEntry[]; stats: Stats; todayTimestamps: TodayTimestamps; apiLogs: ApiLogEntry[];
        };
        const incomingIds = new Set(incoming.map((c) => c.id));
        const fresh = new Set<string>();
        for (const id of incomingIds) if (!prevIds.current.has(id)) fresh.add(id);
        prevIds.current = incomingIds;
        if (fresh.size > 0) {
          setNewIds(fresh);
          setTimeout(() => setNewIds(new Set()), 2000);
        }
        setCalls(incoming);
        setStats(s);
        if (tt) setTodayTimestamps(tt);
        if (al) {
          setApiLogs(al);
          setApiPage((p) => (p > Math.ceil(al.length / PAGE_SIZE) ? 1 : p));
        }
        setCallsPage((p) => (p > Math.ceil(incoming.length / PAGE_SIZE) ? 1 : p));
        setConnected(true);
        setLastUpdate(new Date());
      };
      es.onerror = () => { setConnected(false); es.close(); setTimeout(connect, 5000); };
    }
    connect();
    return () => es?.close();
  }, []);

  const secAgo = lastUpdate ? Math.round((Date.now() - lastUpdate.getTime()) / 1000) : null;

  // Unique accounts derived from calls + api logs
  const accounts = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of calls)   if (c.userEmail) map.set(c.userEmail, c.userName ?? c.userEmail);
    for (const l of apiLogs) if (l.userEmail) map.set(l.userEmail, l.userName ?? l.userEmail);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [calls, apiLogs]);

  const filteredCalls   = filterEmail ? calls.filter((c) => c.userEmail === filterEmail)   : calls;
  const filteredApiLogs = filterEmail ? apiLogs.filter((l) => l.userEmail === filterEmail) : apiLogs;

  const callsSlice = filteredCalls.slice((callsPage - 1) * PAGE_SIZE, callsPage * PAGE_SIZE);
  const apiSlice   = filteredApiLogs.slice((apiPage - 1) * PAGE_SIZE, apiPage * PAGE_SIZE);

  // Bucket raw timestamps by browser-local hour (0–current hour)
  const chartData = (() => {
    const now           = new Date();
    const localMidnight = new Date(now); localMidnight.setHours(0, 0, 0, 0);
    const currentHour   = now.getHours();
    const hourMap: Record<number, { count: number; api: number }> = {};
    for (let h = 0; h <= currentHour; h++) hourMap[h] = { count: 0, api: 0 };
    for (const iso of todayTimestamps.calls) {
      const d = new Date(iso);
      if (d >= localMidnight) { const h = d.getHours(); if (h in hourMap) hourMap[h].count++; }
    }
    for (const iso of todayTimestamps.api) {
      const d = new Date(iso);
      if (d >= localMidnight) { const h = d.getHours(); if (h in hourMap) hourMap[h].api++; }
    }
    return Object.entries(hourMap).map(([k, v]) => ({
      hour: Number(k),
      label: `${String(k).padStart(2, "0")}:00`,
      count: v.count,
      api: v.api,
    }));
  })();

  // suppress unused tick warning — it's used to trigger re-render for secAgo
  void tick;

  return (
    <div className="h-[calc(100dvh-56px)] flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 shrink-0">
        <Link
          href={`/${lang}/admin`}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Admin
        </Link>
        <span className="text-slate-300 text-xs">/</span>
        <span className="text-xs font-semibold text-slate-800">Realtime Dashboard</span>

        <div className="ml-auto flex items-center gap-3">
          {/* Account filter */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={filterEmail ?? ""}
                onChange={(e) => { setFilterEmail(e.target.value || null); setCallsPage(1); setApiPage(1); }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
              >
                <option value="">All accounts ({accounts.length})</option>
                {accounts.map(([email, name]) => (
                  <option key={email} value={email}>{name !== email ? `${name} · ${email}` : email}</option>
                ))}
              </select>
              {filterEmail && (
                <button
                  onClick={() => { setFilterEmail(null); setCallsPage(1); setApiPage(1); }}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Clear filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {connected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
              {secAgo !== null && <span className="text-slate-400 font-normal">· {secAgo}s</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
              <WifiOff className="h-3 w-3" />
              Reconnecting…
            </span>
          )}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-5 gap-2 px-3 py-2 shrink-0">
        {[
          {
            label: "Accounts",
            total: stats?.totalUsers ?? "—",
            today: null,
            accent: "",
          },
          {
            label: "Total Calls",
            total: stats?.totalCalls ?? "—",
            today: stats?.callsToday ?? "—",
            accent: "text-brand-600",
          },
          {
            label: "Minutes",
            total: stats ? stats.totalMinutes.toLocaleString() : "—",
            today: stats ? stats.minutesToday.toLocaleString() : "—",
            accent: "",
          },
          {
            label: "API Calls",
            total: stats?.totalApiCalls ?? "—",
            today: stats?.apiCallsToday ?? "—",
            accent: "text-amber-600",
          },
          {
            label: "Processing",
            total: stats?.activeNow ?? "—",
            today: null,
            accent: stats && stats.activeNow > 0 ? "text-amber-600" : "",
          },
        ].map(({ label, total, today, accent }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
            {today !== null ? (
              <p className="text-xl font-bold tabular-nums leading-tight text-slate-900">
                {total}
                <span className="text-slate-300 font-normal mx-0.5">/</span>
                <span className={`text-base ${accent || "text-slate-500"}`}>{today}</span>
              </p>
            ) : (
              <p className={`text-xl font-bold tabular-nums leading-tight ${accent || "text-slate-900"}`}>{total}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Main grid: left 2/3 (chart + calls) · right 1/3 (API) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-2 px-3 pb-3">

        {/* Left column — chart stacked above calls */}
        <div className="col-span-2 flex flex-col gap-2 min-h-0">

          {/* Chart */}
          <Panel
            title="Today's Activity"
            sub="calls &amp; API by hour"
            right={chartData.length > 0
              ? `peak ${Math.max(...chartData.map((d) => d.count))} calls · ${Math.max(...chartData.map((d) => d.api))} api`
              : undefined}
            className="shrink-0 h-44"
          >
            <div className="flex-1 min-h-0 px-1 py-2">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-300">Loading…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tickLine={false} axisLine={false}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} width={24} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      labelFormatter={(v) => String(v)}
                      formatter={(v, name) => [v ?? 0, name === "count" ? "Calls" : "API requests"]}
                    />
                    <Legend
                      iconType="circle" iconSize={7}
                      formatter={(value) => (
                        <span style={{ fontSize: 10, color: "#64748b" }}>
                          {value === "count" ? "Calls" : "API requests"}
                        </span>
                      )}
                    />
                    <Line
                      dataKey="count" name="count"
                      stroke="#1C78AE" strokeWidth={2}
                      dot={<Dot r={3} fill="#1C78AE" stroke="#fff" strokeWidth={1} />}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      dataKey="api" name="api"
                      stroke="#f59e0b" strokeWidth={2}
                      dot={<Dot r={3} fill="#f59e0b" stroke="#fff" strokeWidth={1} />}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          {/* Calls feed */}
          <Panel
            title="Recent Calls"
            sub={filterEmail ? `filtered · ${filteredCalls.length} of ${calls.length}` : "last 100"}
            right={`${filteredCalls.length} records`}
            className="flex-1 min-h-0"
          >
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 w-20">Time</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2 w-24">Source</th>
                    <th className="px-3 py-2 w-20">Status</th>
                    <th className="px-3 py-2 w-14">Score</th>
                    <th className="px-3 py-2 w-16">Duration</th>
                    <th className="px-3 py-2">Account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {calls.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-300">Waiting for data…</td></tr>
                  )}
                  {callsSlice.map((c) => {
                    const isNew = newIds.has(c.id);
                    const statusCls = STATUS_CLS[c.status] ?? "bg-slate-100 text-slate-600";
                    const dur = fmtDuration(c.durationSeconds);
                    return (
                      <tr key={c.id} className={`transition-colors duration-700 ${isNew ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                        <td className="px-3 py-1.5 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          <div>{formatTime(c.createdAt)}</div>
                          <div className="text-[9px] text-slate-300">{formatDate(c.createdAt)}</div>
                        </td>
                        <td className="px-3 py-1.5 max-w-[160px]">
                          <Link
                            href={`/${lang}/calls/${c.id}`}
                            className="truncate block text-slate-700 font-medium hover:text-brand-600 transition-colors"
                            title={c.fileName}
                          >
                            {c.fileName}
                          </Link>
                        </td>
                        <td className="px-3 py-1.5"><SourceBadge source={c.source} /></td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusCls}`}>
                            <StatusDot status={c.status} />
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-semibold">
                          {c.score !== null
                            ? <span className="text-brand-600">{c.score}<span className="font-normal text-slate-400">/10</span></span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-[10px] text-slate-400 font-mono">
                          {dur ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-[10px] text-slate-500 max-w-[140px]">
                          <div className="truncate">{c.userEmail ?? <span className="text-slate-300">—</span>}</div>
                          {c.userName && <div className="truncate text-[9px] text-slate-400">{c.userName}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginator page={callsPage} total={filteredCalls.length} pageSize={PAGE_SIZE} onChange={setCallsPage} />
          </Panel>
        </div>

        {/* Right column — API requests full height */}
        <Panel
          title="API Requests"
          sub={filterEmail ? `filtered · ${filteredApiLogs.length} of ${apiLogs.length}` : "last 100"}
          right={`${filteredApiLogs.length} records`}
          className="min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Endpoint</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-mono">
                {apiLogs.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-300 font-sans">No API requests yet</td></tr>
                )}
                {apiSlice.map((log) => {
                  const isWarn = log.statusCode >= 400 && log.statusCode < 500;
                  const isErr  = log.statusCode >= 500;
                  const codeCls   = isErr ? "text-red-600 bg-red-50" : isWarn ? "text-amber-600 bg-amber-50" : "text-emerald-700 bg-emerald-50";
                  const statusCls = log.status === "success" ? "text-emerald-600" : log.status === "error" ? "text-red-500" : log.status === "skipped" ? "text-slate-400" : "text-amber-600";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-1.5 text-[10px] text-slate-400 whitespace-nowrap">
                        <div>{formatTime(log.createdAt)}</div>
                        <div className="text-[9px] text-slate-300">{formatDate(log.createdAt)}</div>
                      </td>
                      <td className={`px-3 py-1.5 text-[10px] font-semibold capitalize font-sans ${statusCls}`}>
                        {log.endpoint}
                      </td>
                      <td className={`px-3 py-1.5 text-[10px] font-semibold font-sans ${statusCls}`}>
                        {log.status}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-bold ${codeCls}`}>
                          {log.statusCode}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginator page={apiPage} total={filteredApiLogs.length} pageSize={PAGE_SIZE} onChange={setApiPage} />
        </Panel>

      </div>
    </div>
  );
}
