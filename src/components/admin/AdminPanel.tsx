"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown, ChevronRight, RefreshCw, Shield,
  Users, PhoneCall, CheckCircle2, XCircle, Loader2,
  Clock, User, Search, Wifi, Trash2, UserPlus, X, Key, Activity, Radio,
} from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { PromoCodesSection, type PromoCodeRecord } from "@/components/admin/PromoCodesSection";

type Dictionary = typeof ukDict;

/* ── Shared types ─────────────────────────────────────────────────────────── */

type CallRecord = {
  id: string;
  fileName: string;
  status: string;
  source: string;
  score: number | null;
  saleStatus: string | null;
  language: string | null;
  errorMessage: string | null;
  reportType: string;
  durationSeconds: number | null;
  createdAt: string;
  salesProfileId: string | null;
};

type ProfileRecord = {
  id: string;
  name: string;
  description: string | null;
  photo: string | null;
  calls: CallRecord[];
  createdAt: string;
};

type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type ApiLogRecord = {
  id: string;
  endpoint: string;
  status: string;
  statusCode: number;
  createdAt: string;
};

type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  googleId: string | null;
  isTestAccount: boolean;
  planId: string;
  minutesUsed: number;
  createdAt: string;
  binotelKey: string | null;
  binotelSecret: string | null;
  calls: CallRecord[];
  salesProfiles: ProfileRecord[];
  apiKeys: ApiKeyRecord[];
  apiLogs: ApiLogRecord[];
  _count: { calls: number; salesProfiles: number };
};

/* ── Plan badge colours (matches PlanSection) ─────────────────────────────── */
const PLAN_META: Record<string, { label: string; bg: string; text: string }> = {
  free:    { label: "Free",    bg: "#f1f5f9", text: "#64748b" },
  starter: { label: "Starter", bg: "#dbeafe", text: "#1e40af" },
  growth:  { label: "Growth",  bg: "#e0f2fe", text: "#1C78AE" },
  pro:     { label: "Pro",     bg: "#0B344E", text: "#ffffff" },
};

type Props = {
  t: Dictionary;
  lang: string;
  initialUsers: UserRecord[];
  initialPromoCodes: PromoCodeRecord[];
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const IN_PROGRESS = ["queued", "transcribing", "analyzing"];

function fmt(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? `${m}:${String(s).padStart(2, "0")}`
    : `0:${String(s).padStart(2, "0")}`;
}

/* ── Source badge ─────────────────────────────────────────────────────────── */

const SOURCE_META: Record<string, { label: string; emoji: string; cls: string }> = {
  manual:   { label: "Manual",   emoji: "⬆️", cls: "bg-slate-100 text-slate-500" },
  binotel:  { label: "Binotel",  emoji: "📞", cls: "bg-blue-50 text-blue-600" },
  ringostat:{ label: "Ringostat",emoji: "📡", cls: "bg-indigo-50 text-indigo-600" },
  voiptime: { label: "VoIPTime", emoji: "☁️", cls: "bg-sky-50 text-sky-600" },
  kyivstar: { label: "Kyivstar", emoji: "🌐", cls: "bg-purple-50 text-purple-600" },
  twilio:   { label: "Twilio",   emoji: "🔴", cls: "bg-red-50 text-red-600" },
  aircall:  { label: "Aircall",  emoji: "✈️", cls: "bg-teal-50 text-teal-600" },
  api:      { label: "API",      emoji: "⚡", cls: "bg-amber-50 text-amber-600" },
};

function SourceBadge({ source }: { source: string }) {
  const m = SOURCE_META[source] ?? { label: source, emoji: "🔗", cls: "bg-slate-100 text-slate-500" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${m.cls}`}>
      <span className="leading-none">{m.emoji}</span>
      {m.label}
    </span>
  );
}

/* ── Status badge ─────────────────────────────────────────────────────────── */

function StatusBadge({ status, t }: { status: string; t: Dictionary }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    queued: {
      label: t.admin.statusQueued,
      cls: "bg-slate-100 text-slate-600 border-slate-200",
      icon: <Clock size={10} />,
    },
    transcribing: {
      label: t.admin.statusTranscribing,
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Loader2 size={10} className="animate-spin" />,
    },
    analyzing: {
      label: t.admin.statusAnalyzing,
      cls: "bg-blue-50 text-[#1C78AE] border-blue-200",
      icon: <Loader2 size={10} className="animate-spin" />,
    },
    completed: {
      label: t.admin.statusCompleted,
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 size={10} />,
    },
    failed: {
      label: t.admin.statusFailed,
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle size={10} />,
    },
  };
  const c = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.cls}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

/* ── Sale status badge ────────────────────────────────────────────────────── */

function SaleBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-300">—</span>;
  const map: Record<string, string> = {
    sold: "text-emerald-600 font-semibold",
    not_sold: "text-red-500",
    potential_sale: "text-amber-600",
  };
  const labels: Record<string, string> = {
    sold: "✓", not_sold: "✗", potential_sale: "~",
  };
  return (
    <span className={map[status] ?? "text-slate-500"}>
      {labels[status] ?? status}
    </span>
  );
}

/* ── Calls mini-table ─────────────────────────────────────────────────────── */

function CallsTable({
  calls: initialCalls, t, locale, onCallDeleted,
}: {
  calls: CallRecord[]; t: Dictionary; locale: string;
  onCallDeleted?: (callId: string) => void;
}) {
  const [calls, setCalls]               = useState<CallRecord[]>(initialCalls);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [deletingCall, setDeletingCall] = useState<string | null>(null);

  async function handleDeleteCall(id: string) {
    if (!confirm(t.admin.deleteCallConfirm)) return;
    setDeletingCall(id);
    try {
      const res = await fetch(`/api/admin/calls/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCalls((prev) => prev.filter((c) => c.id !== id));
        onCallDeleted?.(id);
      }
    } finally {
      setDeletingCall(null);
    }
  }

  if (calls.length === 0) {
    return <p className="px-4 py-3 text-xs text-slate-400">{t.admin.noCalls}</p>;
  }

  return (
    <div>
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {calls.map((c) => (
          <Fragment key={c.id}>
            <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-slate-700">{c.fileName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusBadge status={c.status} t={t} />
                    <SourceBadge source={c.source} />
                    <SaleBadge status={c.saleStatus} />
                    {c.score !== null && (
                      <span
                        className="inline-flex h-5 w-7 items-center justify-center rounded text-white text-[10px] font-bold"
                        style={{ background: c.score >= 8 ? "#16a34a" : c.score >= 5 ? "#1C78AE" : "#dc2626" }}
                      >
                        {c.score}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-slate-400">
                    <span>{fmtDate(c.createdAt, locale)}</span>
                    {c.durationSeconds ? <span>{fmtDuration(c.durationSeconds)}</span> : null}
                    {c.language && <span className="uppercase">{c.language}</span>}
                  </div>
                  {expandedError === c.id && c.errorMessage && (
                    <p className="mt-1 font-mono text-[10px] text-red-600 break-all">{c.errorMessage}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {c.status === "failed" && c.errorMessage && (
                    <button
                      onClick={() => setExpandedError(expandedError === c.id ? null : c.id)}
                      className="rounded p-1 text-[10px] text-red-400 underline"
                    >
                      {t.admin.errorDetail}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCall(c.id)}
                    disabled={deletingCall === c.id}
                    className="rounded p-2 text-slate-300 hover:text-red-500 disabled:opacity-40"
                  >
                    {deletingCall === c.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
      <table className="w-full min-w-[700px] text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            {[t.admin.callFile, t.admin.callStatus, t.admin.callScore,
              t.admin.callSale, t.admin.callLang, t.admin.callReport, t.admin.callDuration, t.admin.callDate, ""].map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-slate-400 first:pl-4 last:pr-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <Fragment key={c.id}>
              <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                {/* File name */}
                <td className="max-w-[200px] truncate pl-4 pr-3 py-2 font-mono text-slate-600">
                  {c.fileName}
                </td>
                {/* Status */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={c.status} t={t} />
                    <SourceBadge source={c.source} />
                    {c.status === "failed" && c.errorMessage && (
                      <button
                        onClick={() => setExpandedError(expandedError === c.id ? null : c.id)}
                        className="text-[10px] text-red-500 underline hover:text-red-700"
                      >
                        {t.admin.errorDetail}
                      </button>
                    )}
                  </div>
                </td>
                {/* Score */}
                <td className="px-3 py-2 font-semibold text-slate-700">
                  {c.score !== null ? (
                    <span
                      className="inline-flex h-6 w-8 items-center justify-center rounded-md text-white text-[11px]"
                      style={{
                        background: c.score >= 8 ? "#16a34a" : c.score >= 5 ? "#1C78AE" : "#dc2626",
                      }}
                    >
                      {c.score}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                {/* Sale */}
                <td className="px-3 py-2"><SaleBadge status={c.saleStatus} /></td>
                {/* Lang */}
                <td className="px-3 py-2 uppercase text-slate-400">{c.language ?? "—"}</td>
                {/* Report */}
                <td className="px-3 py-2 text-slate-400 capitalize">{c.reportType}</td>
                {/* Duration */}
                <td className="px-3 py-2 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                  {fmtDuration(c.durationSeconds)}
                </td>
                {/* Date */}
                <td className="pl-3 py-2 text-slate-400 whitespace-nowrap">
                  {fmtDate(c.createdAt, locale)}
                </td>
                {/* Delete */}
                <td className="pr-4 pl-2 py-2 text-right">
                  <button
                    onClick={() => handleDeleteCall(c.id)}
                    disabled={deletingCall === c.id}
                    title={t.admin.deleteCall}
                    className="rounded p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {deletingCall === c.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Trash2 size={12} />
                    }
                  </button>
                </td>
              </tr>
              {expandedError === c.id && c.errorMessage && (
                <tr className="bg-red-50">
                  <td colSpan={9} className="pl-4 pr-4 py-2">
                    <p className="font-mono text-[10px] text-red-700 break-all">{c.errorMessage}</p>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/* ── API status badge ─────────────────────────────────────────────────────── */

const API_STATUS_META: Record<string, { label: string; cls: string }> = {
  success:       { label: "OK",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  skipped:       { label: "Skipped",     cls: "bg-slate-100 text-slate-500 border-slate-200" },
  no_recording:  { label: "No rec",      cls: "bg-amber-50 text-amber-700 border-amber-200" },
  error:         { label: "Error",       cls: "bg-red-50 text-red-600 border-red-200" },
  auth_failed:   { label: "Auth fail",   cls: "bg-red-50 text-red-600 border-red-200" },
  invalid_params:{ label: "Bad params",  cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

/* ── API keys + request log ───────────────────────────────────────────────── */

const API_LOG_PAGE_SIZE = 10;

function ApiSection({ apiKeys, apiLogs, locale, binotelKey, binotelSecret, userId }: {
  apiKeys: ApiKeyRecord[];
  apiLogs: ApiLogRecord[];
  locale: string;
  binotelKey: string | null;
  binotelSecret: string | null;
  userId: string;
}) {
  const [logPage, setLogPage] = useState(1);
  const [logs, setLogs] = useState(apiLogs);
  if (apiKeys.length === 0 && logs.length === 0 && !binotelKey) return null;

  async function handleClearLogs() {
    if (!confirm("Delete all API request logs for this user?")) return;
    const res = await fetch(`/api/admin/api-logs/${userId}`, { method: "DELETE" });
    if (res.ok) setLogs([]);
  }

  const totalPages = Math.max(1, Math.ceil(logs.length / API_LOG_PAGE_SIZE));
  const pageStart  = (logPage - 1) * API_LOG_PAGE_SIZE;
  const pageSlice  = logs.slice(pageStart, pageStart + API_LOG_PAGE_SIZE);
  const from       = pageStart + 1;
  const to         = Math.min(logPage * API_LOG_PAGE_SIZE, logs.length);

  return (
    <div className="border-t border-slate-100">
      <div className="flex items-center justify-between bg-slate-50 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <Key size={12} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">API</span>
        </div>
        {logs.length > 0 && (
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={10} />
            Clear logs
          </button>
        )}
      </div>

      {/* Keys */}
      {(apiKeys.length > 0 || binotelKey) && (
        <div className="px-5 py-3 flex flex-wrap gap-2">
          {apiKeys.map((k) => (
            <div key={k.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs">
              <Key size={10} className="text-slate-400 flex-shrink-0" />
              <span className="font-mono text-slate-700 font-semibold">{k.keyPrefix}…</span>
              <span className="text-slate-400">{k.name}</span>
              {k.lastUsedAt ? (
                <span className="text-slate-400">· {fmtDate(k.lastUsedAt, locale)}</span>
              ) : (
                <span className="text-slate-300">· never used</span>
              )}
            </div>
          ))}
          {binotelKey && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs">
              <span className="text-base leading-none">📞</span>
              <span className="font-semibold text-slate-600">Binotel API Key:</span>
              <span className="font-mono text-slate-700">{binotelKey}</span>
              {binotelSecret && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-600">Secret:</span>
                  <span className="font-mono text-slate-500">{binotelSecret.slice(0, 4)}{"•".repeat(Math.max(0, binotelSecret.length - 4))}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Request log */}
      {logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {["Endpoint", "Status", "Code", "Date", ""].map((h) => (
                  <th key={h} className="px-3 py-1.5 text-left font-medium text-slate-400 first:pl-5 last:pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((log) => {
                const meta = API_STATUS_META[log.status] ?? { label: log.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
                return (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 group">
                    <td className="py-1.5 pl-5 pr-3 font-mono text-slate-600 capitalize">{log.endpoint}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                        <Activity size={8} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-slate-500">{log.statusCode}</td>
                    <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{fmt(log.createdAt, locale)}</td>
                    <td className="pr-4 py-1.5 text-right">
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/api-logs/entry/${log.id}`, { method: "DELETE" });
                          setLogs((prev) => prev.filter((l) => l.id !== log.id));
                        }}
                        className="invisible group-hover:visible rounded p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2">
              <span className="text-[10px] text-slate-400">{from}–{to} of {logs.length}</span>
              <div className="flex items-center gap-0.5">
                {[
                  { label: "«", action: () => setLogPage(1),            disabled: logPage === 1 },
                  { label: "‹", action: () => setLogPage((p) => p - 1), disabled: logPage === 1 },
                  { label: "›", action: () => setLogPage((p) => p + 1), disabled: logPage === totalPages },
                  { label: "»", action: () => setLogPage(totalPages),   disabled: logPage === totalPages },
                ].map(({ label, action, disabled }) => (
                  <button
                    key={label}
                    onClick={action}
                    disabled={disabled}
                    className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default"
                  >
                    {label}
                  </button>
                ))}
                <span className="ml-1 text-[10px] text-slate-400">p.{logPage}/{totalPages}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Single user row ──────────────────────────────────────────────────────── */

type PeriodKey = "all" | "month" | "week" | "3days" | "today";
const PERIOD_OPTIONS: { key: PeriodKey; labelKey: string }[] = [
  { key: "all",   labelKey: "periodAll"   },
  { key: "month", labelKey: "periodMonth" },
  { key: "week",  labelKey: "periodWeek"  },
  { key: "3days", labelKey: "period3days" },
  { key: "today", labelKey: "periodToday" },
];

function UserRow({
  user, t, locale, lang, onDelete, onCallRemoved,
}: {
  user: UserRecord; t: Dictionary; locale: string; lang: string;
  onDelete: (id: string) => void;
  onCallRemoved: (callId: string) => void;
}) {
  const [open, setOpen]                 = useState(false);
  const [isTest, setIsTest]             = useState(!!user.isTestAccount);
  const [planId, setPlanId]             = useState(user.planId);
  const [saving, setSaving]             = useState(false);
  const [savingPlan, setSavingPlan]     = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [profiles, setProfiles]               = useState(user.salesProfiles);
  const [deletingProfile, setDeletingProfile] = useState<string | null>(null);
  const [period, setPeriod]             = useState<PeriodKey>("all");
  const [localCalls, setLocalCalls]     = useState<CallRecord[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const loadedPeriod                    = useRef<string | null>(null);
  const plan = PLAN_META[planId] ?? PLAN_META.free;

  function removeCall(callId: string) {
    setLocalCalls((prev) => prev.filter((c) => c.id !== callId));
    setProfiles((prev) => prev.map((p) => ({ ...p, calls: p.calls.filter((c) => c.id !== callId) })));
    onCallRemoved(callId);
  }

  useEffect(() => {
    if (!open) return;
    if (loadedPeriod.current === period) return;
    loadedPeriod.current = period;
    setCallsLoading(true);
    fetch(`/api/admin/user/${user.id}/calls?period=${period}`)
      .then((r) => r.json())
      .then(({ calls, profiles: p }: { calls: CallRecord[]; profiles: ProfileRecord[] }) => {
        setLocalCalls(calls);
        setProfiles(p);
      })
      .catch(console.error)
      .finally(() => setCallsLoading(false));
  }, [open, period, user.id]);

  const filteredCalls = localCalls;
  const inProgress    = filteredCalls.filter((c) => IN_PROGRESS.includes(c.status)).length;
  const failed        = filteredCalls.filter((c) => c.status === "failed").length;
  const assignedIds   = new Set(profiles.map((p) => p.id));
  const unassigned    = filteredCalls.filter((c) => !c.salesProfileId || !assignedIds.has(c.salesProfileId));
  const initials   = (user.name || user.email)[0].toUpperCase();

  async function handleTestToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setIsTest(next);       // optimistic
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/user/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTestAccount: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setIsTest(!next);    // rollback
    } finally {
      setSaving(false);
    }
  }

  async function handlePlanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const prev = planId;
    setPlanId(next);       // optimistic
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/admin/user/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPlanId(prev);     // rollback
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleDelete() {
    const label = user.name || user.email;
    const msg   = t.admin.deleteConfirm.replace("{name}", label);
    if (!confirm(msg)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/user/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDelete(user.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteProfile(id: string, name: string) {
    const msg = t.admin.deleteProfileConfirm.replace("{name}", name);
    if (!confirm(msg)) return;
    setDeletingProfile(id);
    try {
      const res = await fetch(`/api/admin/profiles/${id}`, { method: "DELETE" });
      if (res.ok) setProfiles((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingProfile(null);
    }
  }

  const rowBg = isTest ? "bg-amber-50/40" : "bg-white";
  const borderColor = isTest ? "border-amber-200" : "border-slate-200";

  return (
    <div className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${rowBg} ${borderColor}`}>
      {/* ── Header row — use div so we can nest real interactive controls ── */}
      <div className="flex w-full flex-wrap items-center gap-3 px-4 py-3 md:px-5 md:py-4">
        {/* Expand zone (clickable area) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((p) => !p)}
          onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
        >
          {/* Avatar */}
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: isTest ? "#92400e" : "#1C78AE" }}
            >
              {initials}
            </span>
          )}

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {user.name ?? "—"}
              {user.googleId && (
                <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 uppercase tracking-wide">
                  Google
                </span>
              )}
              {isTest && (
                <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase tracking-wide">
                  {t.admin.testBadge}
                </span>
              )}
              <span
                className="ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ background: plan.bg, color: plan.text }}
              >
                {plan.label}
              </span>
            </p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>

          {/* Joined */}
          <div className="hidden text-right md:block">
            <p className="text-xs text-slate-400">{t.admin.joined}</p>
            <p className="text-xs font-medium text-slate-600">{fmtDate(user.createdAt, locale)}</p>
          </div>

          {/* Counts */}
          <div className="flex flex-wrap items-center gap-1.5 pl-1">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <Users size={11} />
              {profiles.length}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <PhoneCall size={11} />
              {open ? filteredCalls.length : user._count.calls}
            </span>
            {inProgress > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                <Loader2 size={11} className="animate-spin" />
                {inProgress}
              </span>
            )}
            {failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200">
                <XCircle size={11} />
                {failed}
              </span>
            )}
          </div>

          {/* Chevron */}
          <span className="flex-shrink-0 text-slate-400">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </div>

        {/* ── Controls: plan / delete / test ── */}
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:contents">
        {/* ── Plan selector ── */}
        <div className="relative flex-shrink-0">
          <select
            value={planId}
            onChange={handlePlanChange}
            disabled={savingPlan}
            className="appearance-none rounded-lg border pl-3 pr-7 py-1.5 text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1C78AE]/30"
            style={{ background: plan.bg, color: plan.text, borderColor: plan.bg === "#f1f5f9" ? "#e2e8f0" : plan.bg }}
          >
            {Object.entries(PLAN_META).map(([id, meta]) => (
              <option key={id} value={id}>{meta.label}</option>
            ))}
          </select>
          {savingPlan
            ? <Loader2 size={10} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 animate-spin" style={{ color: plan.text }} />
            : <ChevronDown size={10} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: plan.text }} />
          }
        </div>

        {/* ── Delete account ── */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          title={t.admin.deleteAccount}
          className="flex-shrink-0 rounded-lg border border-red-200 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
        >
          {deleting
            ? <Loader2 size={14} className="animate-spin" />
            : <Trash2 size={14} />
          }
        </button>

        {/* ── View as user ── */}
        {[
          { href: `/${lang}/dashboard?viewAs=${user.id}`,  label: "Dashboard" },
          { href: `/${lang}/analytics?viewAs=${user.id}`,  label: "Analytics" },
          { href: `/${lang}/calls?viewAs=${user.id}`,      label: "Calls" },
          { href: `/${lang}/profiles?viewAs=${user.id}`,   label: "Profiles" },
        ].map(({ href, label }) => (
          <Link
            key={label}
            href={href}
            target="_blank"
            className="flex-shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            {label}
          </Link>
        ))}

        {/* ── Test account toggle (separate from expand zone) ── */}
        <label
          className="flex flex-shrink-0 cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          style={
            isTest
              ? { borderColor: "#fbbf24", background: "#fef3c7", color: "#92400e" }
              : { borderColor: "#e2e8f0", background: "transparent", color: "#64748b" }
          }
          title={t.admin.testAccount}
        >
          <input
            type="checkbox"
            checked={isTest}
            disabled={saving}
            onChange={handleTestToggle}
            className="h-3.5 w-3.5 accent-amber-500 disabled:opacity-50"
          />
          {saving ? <Loader2 size={11} className="animate-spin" /> : t.admin.testAccount}
        </label>
        </div>{/* end controls wrapper */}
      </div>

      {/* ── Expanded content ── */}
      {open && (
        <div className="border-t border-slate-100">
          {/* Period filter */}
          <div className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 bg-slate-50/60">
            {PERIOD_OPTIONS.map(({ key, labelKey }) => {
              const label = (t.analytics as Record<string, string>)[labelKey] ?? labelKey;
              return (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    period === key
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {period !== "all" && (
              <span className="ml-1 text-[11px] text-slate-400">
                {filteredCalls.length} з {localCalls.length} дзвінків
              </span>
            )}
          </div>

          {/* Calls loading state */}
          {callsLoading && (
            <div className="flex items-center gap-2 px-5 py-4 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin" />
              Завантаження дзвінків…
            </div>
          )}

          {/* Profiles */}
          {!callsLoading && profiles.length > 0 ? (
            profiles.map((profile) => (
              <div key={profile.id} className="border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 bg-slate-50 px-5 py-2.5">
                  {profile.photo ? (
                    <ProfileAvatar photo={profile.photo} name={profile.name} className="h-6 w-6" textClassName="text-xs" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1C78AE]/10">
                      <User size={12} className="text-[#1C78AE]" />
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-700">{profile.name}</span>
                  {profile.description && (
                    <span className="text-xs text-slate-400">· {profile.description}</span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    <PhoneCall size={9} />
                    {profile.calls.length}
                  </span>
                  {/* Delete profile */}
                  <button
                    onClick={() => handleDeleteProfile(profile.id, profile.name)}
                    disabled={deletingProfile === profile.id}
                    title={t.admin.deleteProfile}
                    className="ml-1 rounded p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {deletingProfile === profile.id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Trash2 size={15} />
                    }
                  </button>
                </div>
                <CallsTable
                  calls={profile.calls}
                  t={t}
                  locale={locale}
                  onCallDeleted={(callId) => removeCall(callId)}
                />
              </div>
            ))
          ) : !callsLoading ? (
            <p className="px-5 py-3 text-xs text-slate-400">{t.admin.noManagers}</p>
          ) : null}

          {/* Unassigned calls */}
          {!callsLoading && unassigned.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 px-5 py-2.5">
                <PhoneCall size={12} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">{t.admin.unassigned}</span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {unassigned.length}
                </span>
              </div>
              <CallsTable
                calls={unassigned}
                t={t}
                locale={locale}
                onCallDeleted={(callId) => removeCall(callId)}
              />
            </div>
          )}

          {/* API keys + request log */}
          <ApiSection apiKeys={user.apiKeys} apiLogs={user.apiLogs} locale={locale} binotelKey={user.binotelKey} binotelSecret={user.binotelSecret} userId={user.id} />
        </div>
      )}
    </div>
  );
}

/* ── Processing queue panel ───────────────────────────────────────────────── */

function ProcessingQueue({ users, t, locale }: { users: UserRecord[]; t: Dictionary; locale: string }) {
  const queue = users.flatMap((u) =>
    u.calls
      .filter((c) => IN_PROGRESS.includes(c.status))
      .map((c) => ({ ...c, userEmail: u.email }))
  );

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 px-5 py-3">
        <Loader2 size={14} className="animate-spin text-amber-600" />
        <h2 className="text-sm font-bold text-amber-800">{t.admin.processingQueue}</h2>
        <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
          {queue.length}
        </span>
      </div>

      {queue.length === 0 ? (
        <p className="px-5 py-4 text-xs text-amber-600">{t.admin.processingQueueEmpty}</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-amber-100">
            {queue.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={c.status} t={t} />
                  <span className="text-[10px] text-amber-600">{fmt(c.createdAt, locale)}</span>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-amber-700">{c.fileName}</p>
                <p className="mt-0.5 text-[10px] text-amber-500">{c.userEmail}</p>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="border-b border-amber-200">
                  {["Account", t.admin.callFile, t.admin.callStatus, t.admin.callDate].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-amber-700 first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((c) => (
                  <tr key={c.id} className="border-b border-amber-100 last:border-0">
                    <td className="py-2 pl-5 pr-4 text-amber-800">{c.userEmail}</td>
                    <td className="px-4 py-2 font-mono text-amber-700 max-w-[160px] truncate">{c.fileName}</td>
                    <td className="px-4 py-2"><StatusBadge status={c.status} t={t} /></td>
                    <td className="px-4 py-2 text-amber-600 whitespace-nowrap">{fmt(c.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main admin panel ─────────────────────────────────────────────────────── */

/* ── Create account modal ─────────────────────────────────────────────────── */

function CreateAccountModal({
  t, onClose, onCreated,
}: {
  t: Dictionary;
  onClose: () => void;
  onCreated: (user: UserRecord) => void;
}) {
  const ta = t.admin;
  const [email,     setEmail]     = useState("");
  const [name,      setName]      = useState("");
  const [password,  setPassword]  = useState("");
  const [planId,    setPlanId]    = useState("free");
  const [isTest,    setIsTest]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res  = await fetch("/api/admin/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, name, password, planId, isTestAccount: isTest }),
      });
      const data = await res.json();
      if (res.status === 409) { setError(ta.errorEmailTaken); return; }
      if (!res.ok)            { setError(ta.errorCreate);     return; }
      onCreated({
        id:            data.id,
        name:          data.name,
        email:         data.email,
        image:         null,
        googleId:      null,
        isTestAccount: data.isTestAccount,
        planId:        data.planId ?? planId,
        minutesUsed:   0,
        createdAt:     data.createdAt,
        binotelKey:    null,
        binotelSecret: null,
        calls:         [],
        salesProfiles: [],
        apiKeys:       [],
        apiLogs:       [],
        _count:        { calls: 0, salesProfiles: 0 },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">{ta.createAccountTitle}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">{ta.fieldEmail} *</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">{ta.fieldName}</label>
            <input
              type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">{ta.fieldPassword} *</label>
            <input
              type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">{ta.fieldPlan}</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {Object.entries(PLAN_META).map(([id, meta]) => (
                <option key={id} value={id}>{meta.label}</option>
              ))}
            </select>
          </div>

          {/* Test account */}
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox" checked={isTest}
              onChange={(e) => setIsTest(e.target.checked)}
              className="h-4 w-4 accent-amber-500 rounded"
            />
            <span className="text-sm text-slate-700">{ta.fieldTestAccount}</span>
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t.auth.cancel ?? "Cancel"}
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving ? ta.creating : ta.createAccount}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main admin panel ─────────────────────────────────────────────────────── */

export function AdminPanel({ t, lang, initialUsers, initialPromoCodes }: Props) {
  const router = useRouter();
  const locale = t.dateLocale;

  const [users, setUsers]               = useState<UserRecord[]>(initialUsers);
  const [search, setSearch]             = useState("");
  const [hideTest, setHideTest]         = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastRefresh, setLastRefresh]   = useState(new Date());
  const [showCreate, setShowCreate]     = useState(false);

  // IDs of calls individually deleted via the admin panel (not via full account removal).
  // Kept as a Set so filtering allCalls stays O(n).
  const [removedCallIds, setRemovedCallIds] = useState<Set<string>>(new Set());

  function handleUserDeleted(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  function handleUserCreated(user: UserRecord) {
    setUsers((prev) => [user, ...prev]);
  }

  function handleCallRemoved(callId: string) {
    setRemovedCallIds((prev) => new Set([...prev, callId]));
  }

  // Compute global stats — exclude individually-deleted calls
  const allCalls = users
    .flatMap((u) => u.calls)
    .filter((c) => !removedCallIds.has(c.id));
  const testCount    = users.filter((u) => u.isTestAccount).length;
  const totalMinutes = users.reduce((sum, u) => sum + (u.minutesUsed ?? 0), 0);

  // Plan distribution — count accounts per plan
  const planCounts = Object.fromEntries(
    Object.keys(PLAN_META).map((id) => [id, users.filter((u) => u.planId === id).length])
  ) as Record<string, number>;

  const stats = {
    users:      users.length,
    total:      allCalls.length,
    inProgress: allCalls.filter((c) => IN_PROGRESS.includes(c.status)).length,
    completed:  allCalls.filter((c) => c.status === "completed").length,
    failed:     allCalls.filter((c) => c.status === "failed").length,
  };

  const hasInProgress = stats.inProgress > 0;

  // Filtered users — search + optional hide-test
  const q = search.trim().toLowerCase();
  const filtered = users
    .filter((u) => !hideTest || !u.isTestAccount)
    .filter((u) =>
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.name ?? "").toLowerCase().includes(q)
    );

  // Refresh: re-runs the server component
  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    router.refresh();
    setLastRefresh(new Date());
    setTimeout(() => setRefreshing(false), 800);
  }, [router]);

  // Auto-refresh every 6 s when calls are in progress
  useEffect(() => {
    if (!hasInProgress) return;
    const id = setInterval(doRefresh, 6000);
    return () => clearInterval(id);
  }, [hasInProgress, doRefresh]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-4 md:px-6 md:py-8 md:space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#1C78AE" }}>
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-[#06142E]">{t.admin.title}</h1>
          <p className="text-xs text-slate-400">{t.admin.subtitle}</p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Auto-refresh indicator */}
          {hasInProgress && (
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200 sm:inline-flex">
              <Wifi size={11} className="animate-pulse" />
              {t.admin.autoRefresh}
            </span>
          )}

          {/* Last refresh — suppressHydrationWarning because this is an
              intentionally dynamic timestamp that differs between SSR and hydration */}
          <span className="hidden text-xs text-slate-400 sm:block" suppressHydrationWarning>
            {lastRefresh.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>

          {/* Realtime dashboard link */}
          <Link
            href={`/${lang}/admin/realtime`}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 md:px-4"
          >
            <Radio size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Realtime</span>
          </Link>

          {/* Create account */}
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 md:px-4"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">{t.admin.createAccount}</span>
          </button>

          {/* Manual refresh */}
          <button
            onClick={doRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 md:px-4"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{t.admin.refresh}</span>
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { icon: <User size={16} />,        value: stats.users,      label: t.admin.totalUsers,  color: "#1C78AE" },
          { icon: <PhoneCall size={16} />,   value: stats.total,      label: t.admin.totalCalls,  color: "#06142E" },
          { icon: <Loader2 size={16} className={stats.inProgress > 0 ? "animate-spin" : ""} />,
                                             value: stats.inProgress,  label: t.admin.inProgress,  color: "#d97706" },
          { icon: <CheckCircle2 size={16} />,value: stats.completed,  label: t.admin.completed,   color: "#16a34a" },
          { icon: <XCircle size={16} />,     value: stats.failed,     label: t.admin.failed,      color: "#dc2626" },
        ].map(({ icon, value, label, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5" style={{ color }}>
              {icon}
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-extrabold" style={{ color: "#06142E" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Plan distribution + total minutes ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Accounts by plan */}
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.admin.planDistribution}
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PLAN_META).map(([id, meta]) => (
              <div
                key={id}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                style={{ borderColor: meta.bg === "#f1f5f9" ? "#e2e8f0" : meta.bg }}
              >
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                  style={{ background: meta.bg, color: meta.text }}
                >
                  {meta.label}
                </span>
                <span className="text-sm font-bold text-slate-700">{planCounts[id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total minutes used */}
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.admin.totalMinutes}
          </p>
          <p className="text-3xl font-extrabold text-[#06142E]">
            {totalMinutes.toLocaleString()}
            <span className="ml-1 text-base font-medium text-slate-400">min</span>
          </p>
        </div>
      </div>

      {/* ── Processing queue ── (only when calls are in progress) */}
      {hasInProgress && (
        <ProcessingQueue users={users} t={t} locale={locale} />
      )}

      {/* ── Promo Codes section ── */}
      <PromoCodesSection initialCodes={initialPromoCodes} />

      {/* ── Search + filter row ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.admin.search}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm placeholder-slate-400 focus:border-[#1C78AE] focus:outline-none focus:ring-2 focus:ring-[#1C78AE]/20"
          />
        </div>

        {/* Hide/show test accounts toggle */}
        {testCount > 0 && (
          <button
            onClick={() => setHideTest((p) => !p)}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors"
            style={
              hideTest
                ? { borderColor: "#fbbf24", background: "#fef3c7", color: "#92400e" }
                : { borderColor: "#e2e8f0", background: "white", color: "#64748b" }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: hideTest ? "#f59e0b" : "#cbd5e1" }}
            />
            {hideTest ? t.admin.showTestAccounts : t.admin.hideTestAccounts}
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              {testCount}
            </span>
          </button>
        )}
      </div>

      {/* ── User list ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <p className="text-sm text-slate-400">{t.admin.noResults}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <UserRow key={u.id} user={u} t={t} locale={locale} lang={lang} onDelete={handleUserDeleted} onCallRemoved={handleCallRemoved} />
          ))}
        </div>
      )}

      {/* ── Create account modal ── */}
      {showCreate && (
        <CreateAccountModal
          t={t}
          onClose={() => setShowCreate(false)}
          onCreated={handleUserCreated}
        />
      )}
    </div>
  );
}
