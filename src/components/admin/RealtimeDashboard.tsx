"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, WifiOff } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
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
  activeNow: number;
  callsToday: number;
};

type DayPoint = { date: string; count: number; api: number };

type ApiLogEntry = {
  id: string;
  endpoint: string;
  status: string;
  statusCode: number;
  userId: string;
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>
      <span>{m.emoji}</span>
      {m.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const pulse = status === "transcribing" || status === "analyzing" || status === "queued";
  const color =
    status === "completed"    ? "bg-emerald-400" :
    status === "failed"       ? "bg-red-400" :
    status === "queued"       ? "bg-slate-300" :
    "bg-brand-400";
  return (
    <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${color} ${pulse ? "animate-pulse" : ""}`} />
  );
}

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${accent ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
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

/* ── Main component ── */
export function RealtimeDashboard({ lang }: { lang: string }) {
  const [calls, setCalls]         = useState<CallEntry[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [callsPerDay, setCallsPerDay] = useState<DayPoint[]>([]);
  const [apiLogs, setApiLogs]     = useState<ApiLogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [newIds, setNewIds]     = useState<Set<string>>(new Set());
  const prevIds                 = useRef<Set<string>>(new Set());
  const [tick, setTick]         = useState(0);

  // Clock for "last updated X sec ago"
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let es: EventSource;

    function connect() {
      es = new EventSource("/api/admin/realtime");

      es.onmessage = (e) => {
        const { calls: incoming, stats: s, callsPerDay: cpd, apiLogs: al } = JSON.parse(e.data) as {
          calls: CallEntry[];
          stats: Stats;
          callsPerDay: DayPoint[];
          apiLogs: ApiLogEntry[];
        };

        // Detect truly new IDs (not seen in previous batch)
        const incomingIds = new Set(incoming.map((c) => c.id));
        const fresh = new Set<string>();
        for (const id of incomingIds) {
          if (!prevIds.current.has(id)) fresh.add(id);
        }
        prevIds.current = incomingIds;

        if (fresh.size > 0) {
          setNewIds(fresh);
          setTimeout(() => setNewIds(new Set()), 2000);
        }

        setCalls(incoming);
        setStats(s);
        if (cpd) setCallsPerDay(cpd);
        if (al) setApiLogs(al);
        setConnected(true);
        setLastUpdate(new Date());
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000); // reconnect
      };
    }

    connect();
    return () => es?.close();
  }, []);

  const secAgo = lastUpdate ? Math.round((Date.now() - lastUpdate.getTime()) / 1000) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link
            href={`/${lang}/admin`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-sm font-semibold text-slate-800">Realtime Dashboard</h1>

          <div className="ml-auto flex items-center gap-3">
            {connected ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
                {secAgo !== null && <span className="text-slate-400 font-normal">· {secAgo}s ago</span>}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                <WifiOff className="h-3 w-3" />
                Reconnecting…
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Accounts"
            value={stats?.totalUsers ?? "—"}
            sub="registered users"
          />
          <StatCard
            label="Total Calls"
            value={stats?.totalCalls ?? "—"}
            sub="all time"
          />
          <StatCard
            label="Minutes Used"
            value={stats ? `${stats.totalMinutes.toLocaleString()}` : "—"}
            sub="across all plans"
          />
          <StatCard
            label="Today"
            value={stats?.callsToday ?? "—"}
            sub="calls uploaded"
            accent="text-brand-600"
          />
          <StatCard
            label="Processing"
            value={stats?.activeNow ?? "—"}
            sub="queued / active"
            accent={stats && stats.activeNow > 0 ? "text-amber-600" : "text-slate-900"}
          />
        </div>

        {/* Calls per day chart */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Calls per Day
              <span className="ml-2 text-xs font-normal text-slate-400">last 30 days</span>
            </h2>
            {callsPerDay.length > 0 && (
              <span className="text-xs text-slate-400">
                peak {Math.max(...callsPerDay.map((d) => d.count))} calls · {Math.max(...callsPerDay.map((d) => d.api))} api
              </span>
            )}
          </div>
          <div className="px-2 py-4 h-52">
            {callsPerDay.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-300">
                Loading…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callsPerDay} margin={{ top: 4, right: 16, left: -16, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + "T00:00:00");
                      return d.toLocaleDateString([], { month: "short", day: "numeric" });
                    }}
                    interval={Math.floor(callsPerDay.length / 6)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    labelFormatter={(v) =>
                      typeof v === "string"
                        ? new Date(v + "T00:00:00").toLocaleDateString([], {
                            weekday: "short", month: "short", day: "numeric",
                          })
                        : String(v)
                    }
                    formatter={(v, name) => [v ?? 0, name === "count" ? "Calls" : "API requests"]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {value === "count" ? "Calls" : "API requests"}
                      </span>
                    )}
                  />
                  <Bar dataKey="count" name="count" fill="#1C78AE" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="api"   name="api"   fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* API Requests panel */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">
              API Requests
              <span className="ml-2 text-xs font-normal text-slate-400">last 100</span>
            </h2>
            <span className="text-xs text-slate-400">{apiLogs.length} records</span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 w-36">Time</th>
                  <th className="px-4 py-2.5 w-32">Endpoint</th>
                  <th className="px-4 py-2.5 w-24">Status</th>
                  <th className="px-4 py-2.5 w-20">Code</th>
                  <th className="px-4 py-2.5">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-mono">
                {apiLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-300 font-sans">
                      No API requests yet
                    </td>
                  </tr>
                )}
                {apiLogs.map((log) => {
                  const isOk = log.statusCode >= 200 && log.statusCode < 300;
                  const isWarn = log.statusCode >= 400 && log.statusCode < 500;
                  const isErr = log.statusCode >= 500;
                  const codeCls = isErr ? "text-red-600 bg-red-50" : isWarn ? "text-amber-600 bg-amber-50" : "text-emerald-700 bg-emerald-50";
                  const statusCls = log.status === "success" ? "text-emerald-600" : log.status === "error" ? "text-red-500" : log.status === "skipped" ? "text-slate-400" : "text-amber-600";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 text-xs text-slate-400 whitespace-nowrap">
                        <div>{formatTime(log.createdAt)}</div>
                        <div className="text-[10px] text-slate-300">{formatDate(log.createdAt)}</div>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-700 font-semibold capitalize">
                        {log.endpoint}
                      </td>
                      <td className={`px-4 py-2 text-xs font-semibold ${statusCls}`}>
                        {log.status}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${codeCls}`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[11px] text-slate-400 truncate max-w-[160px]">
                        {log.userId}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {apiLogs.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-300">No API requests yet</p>
            )}
            {apiLogs.map((log) => {
              const isErr = log.statusCode >= 500;
              const isWarn = log.statusCode >= 400 && log.statusCode < 500;
              const codeCls = isErr ? "text-red-600 bg-red-50" : isWarn ? "text-amber-600 bg-amber-50" : "text-emerald-700 bg-emerald-50";
              const statusCls = log.status === "success" ? "text-emerald-600" : log.status === "error" ? "text-red-500" : log.status === "skipped" ? "text-slate-400" : "text-amber-600";
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`shrink-0 inline-block rounded px-1.5 py-0.5 text-xs font-bold font-mono ${codeCls}`}>
                    {log.statusCode}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 capitalize">{log.endpoint}</span>
                      <span className={`text-[10px] font-semibold ${statusCls}`}>{log.status}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{formatTime(log.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live feed */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Recent Calls
              <span className="ml-2 text-xs font-normal text-slate-400">last 100</span>
            </h2>
            <span className="text-xs text-slate-400">{calls.length} records</span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 w-24">Time</th>
                  <th className="px-4 py-2.5">File</th>
                  <th className="px-4 py-2.5 w-28">Source</th>
                  <th className="px-4 py-2.5 w-28">Type</th>
                  <th className="px-4 py-2.5 w-28">Status</th>
                  <th className="px-4 py-2.5 w-20">Score</th>
                  <th className="px-4 py-2.5 w-20">Duration</th>
                  <th className="px-4 py-2.5">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      Waiting for data…
                    </td>
                  </tr>
                )}
                {calls.map((c) => {
                  const isNew = newIds.has(c.id);
                  const statusCls = STATUS_CLS[c.status] ?? "bg-slate-100 text-slate-600";
                  const dur = fmtDuration(c.durationSeconds);
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors duration-700 ${isNew ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap font-mono">
                        <div>{formatTime(c.createdAt)}</div>
                        <div className="text-[10px] text-slate-300">{formatDate(c.createdAt)}</div>
                      </td>
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <Link
                          href={`/${lang}/calls/${c.id}`}
                          className="truncate block text-slate-700 font-medium hover:text-brand-600 transition-colors"
                          title={c.fileName}
                        >
                          {c.fileName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <SourceBadge source={c.source} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {REPORT_LABELS[c.reportType] ?? c.reportType}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>
                          <StatusDot status={c.status} />
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm font-semibold">
                        {c.score !== null
                          ? <span className="text-brand-600">{c.score}<span className="text-xs font-normal text-slate-400">/10</span></span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">
                        {dur ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[160px]">
                        <div className="truncate" title={c.userEmail ?? undefined}>
                          {c.userEmail ?? <span className="text-slate-300">—</span>}
                        </div>
                        {c.userName && (
                          <div className="truncate text-[10px] text-slate-400">{c.userName}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {calls.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-slate-400">Waiting for data…</p>
            )}
            {calls.map((c) => {
              const isNew = newIds.has(c.id);
              const statusCls = STATUS_CLS[c.status] ?? "bg-slate-100 text-slate-600";
              const dur = fmtDuration(c.durationSeconds);
              return (
                <Link
                  key={c.id}
                  href={`/${lang}/calls/${c.id}`}
                  className={`block px-4 py-3 transition-colors ${isNew ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-800">{c.fileName}</p>
                    <span className="shrink-0 text-xs text-slate-400 font-mono">{formatTime(c.createdAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={c.source} />
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>
                      <StatusDot status={c.status} />
                      {c.status}
                    </span>
                    {c.score !== null && (
                      <span className="text-xs font-semibold text-brand-600">{c.score}/10</span>
                    )}
                    {dur && <span className="text-[10px] text-slate-400 font-mono">{dur}</span>}
                  </div>
                  {c.userEmail && (
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">{c.userEmail}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
