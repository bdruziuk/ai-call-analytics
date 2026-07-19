"use client";

import Link from "next/link";
import { Eye, Loader2, Trash2, X } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useEffect, useRef, useState, useCallback } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { OwnerDashboard } from "@/components/dashboard/analytics/OwnerDashboard";
import { MarketerDashboard } from "@/components/dashboard/analytics/MarketerDashboard";
import type { OwnerAnalytics, MarketerAnalytics } from "@/lib/analytics-types";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;
type ReportType = "high_level" | "medium" | "detailed";

type CallItem = {
  id: string;
  fileName: string;
  status: string;
  reportType: string;
  language: string | null;
  product: string | null;
  saleStatus: string | null;
  score: number | null;
  createdAt: string;
  errorMessage: string | null;
  salesProfileId: string | null;
  internalNumber: string | null;
};

type SalesProfile = {
  id: string;
  name: string;
  description: string | null;
  photo: string | null;
};

type PeriodKey = "all" | "month" | "week" | "3days" | "today";

type Props = {
  t: Dictionary;
  lang: string;
  profiles: SalesProfile[];
  initialManagerFilter?: string;
  planId: string;
  isTestAccount?: boolean;
  viewAs?: string;
  ownerAnalytics: OwnerAnalytics;
  marketerAnalytics: MarketerAnalytics;
};

type SortKey = "createdAt" | "fileName" | "score" | "status" | "saleStatus" | "product";
type SortDir = "asc" | "desc";

/* ── Sort helpers ── */
function sortIcon(active: boolean, dir: SortDir) {
  return (
    <span className={`ml-1 text-[10px] leading-none ${active ? "text-brand-500" : "text-slate-300"}`}>
      {!active ? "⇅" : dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

function SortableHeader({
  col, label, sortKey, sortDir, onSort,
}: {
  col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = col === sortKey;
  return (
    <th className="px-4 py-3">
      <button
        onClick={() => onSort(col)}
        className="flex items-center text-xs font-semibold uppercase tracking-wide text-brand-700 hover:text-brand-900 transition-colors"
      >
        {label}
        {sortIcon(active, sortDir)}
      </button>
    </th>
  );
}

function sortCalls(arr: CallItem[], key: SortKey, dir: SortDir): CallItem[] {
  return [...arr].sort((a, b) => {
    let av: string | number, bv: string | number;
    switch (key) {
      case "createdAt":  av = a.createdAt;                       bv = b.createdAt;                       break;
      case "fileName":   av = a.fileName.toLowerCase();           bv = b.fileName.toLowerCase();           break;
      case "score":      av = a.score ?? -1;                     bv = b.score ?? -1;                     break;
      case "status":     av = a.status;                          bv = b.status;                          break;
      case "saleStatus": av = a.saleStatus ?? "";                bv = b.saleStatus ?? "";                break;
      case "product":    av = (a.product ?? "").toLowerCase();   bv = (b.product ?? "").toLowerCase();   break;
      default: return 0;
    }
    return av < bv ? (dir === "asc" ? -1 : 1) : av > bv ? (dir === "asc" ? 1 : -1) : 0;
  });
}

/* ── Badges ── */
function StatusBadge({ status, label, error }: { status: string; label: string; error?: string | null }) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium";
  const map: Record<string, string> = {
    queued:      "bg-slate-100 text-slate-600",
    transcribing:"bg-brand-100 text-brand-700",
    analyzing:   "bg-brand-100 text-brand-700",
    completed:   "bg-emerald-100 text-emerald-700",
    failed:      "bg-red-100 text-red-700",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600";
  const pulse = (status === "transcribing" || status === "analyzing");

  return (
    <span>
      <span className={`${base} ${cls}`}>
        {pulse && <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />}
        {label}
      </span>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </span>
  );
}

function SaleStatusBadge({ status, label }: { status: string | null; label: string }) {
  if (!status) return <span className="text-slate-400">-</span>;
  const base = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium";
  const map: Record<string, string> = {
    sold:           "bg-emerald-100 text-emerald-700",
    not_sold:       "bg-red-100 text-red-700",
    potential_sale: "bg-amber-100 text-amber-700",
  };
  return <span className={`${base} ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{label}</span>;
}

/* ── Main component ── */
export function DashboardClient({ t, lang, profiles, initialManagerFilter = "", planId, isTestAccount = false, viewAs, ownerAnalytics, marketerAnalytics }: Props) {
  // Test accounts bypass all plan restrictions
  const isFree    = !isTestAccount && planId === "free";
  const isStarter = !isTestAccount && planId === "starter";

  const [period, setPeriod]         = useState<PeriodKey>("today");
  const [analyticsData, setAnalyticsData] = useState<{ ownerAnalytics: OwnerAnalytics; marketerAnalytics: MarketerAnalytics }>({ ownerAnalytics, marketerAnalytics });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [calls, setCalls]           = useState<CallItem[]>([]);
  const [totalCalls, setTotalCalls] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number>(0);
  const [saleRate, setSaleRate]         = useState<number>(0);
  const [failedCalls, setFailedCalls]   = useState<number>(0);
  type ChartBucket = { label: string; total: number; completed: number; failed: number };
  const [chartData, setChartData] = useState<ChartBucket[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [files, setFiles]           = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [reportType, setReportType] = useState<ReportType>(isFree ? "high_level" : "medium");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [filterProfileId, setFilterProfileId]     = useState<string>(initialManagerFilter);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"calls" | "owner" | "marketer">("calls");
  const periodRef     = useRef<PeriodKey>("today");
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const sentinelRef   = useRef<HTMLDivElement>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.admin.deleteCallConfirm)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/calls/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCalls((prev) => prev.filter((c) => c.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function getLanguageLabel(lang: string | null): string {
    if (!lang) return "-";
    switch (lang) {
      case "uk": return t.callLanguage.uk;
      case "ru": return t.callLanguage.ru;
      case "en": return t.callLanguage.en;
      case "uk_ru": return t.callLanguage.uk_ru;
      default: return lang;
    }
  }

  function formatError(msg: string | null): string | null {
    if (!msg) return null;
    if (msg.startsWith("LANG_UNSUPPORTED:")) {
      const l = msg.slice("LANG_UNSUPPORTED:".length);
      return t.errors.unsupportedLanguage.replace("{language}", l);
    }
    return msg;
  }

  function getSaleStatusLabel(status?: string | null) {
    switch (status) {
      case "sold":           return t.dashboard.saleStatus.sold;
      case "not_sold":       return t.dashboard.saleStatus.not_sold;
      case "potential_sale": return t.dashboard.saleStatus.potential_sale;
      default: return "-";
    }
  }

  function getReportTypeLabel(rt?: string | null) {
    switch (rt) {
      case "high_level": return t.dashboard.reportTypes.high_level;
      case "medium":     return t.dashboard.reportTypes.medium;
      case "detailed":   return t.dashboard.reportTypes.detailed;
      default: return "-";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "queued":      return t.dashboard.processingStatus.queued;
      case "transcribing":return t.dashboard.processingStatus.transcribing;
      case "analyzing":   return t.dashboard.processingStatus.analyzing;
      case "completed":   return t.dashboard.processingStatus.completed;
      case "failed":      return t.dashboard.processingStatus.failed;
      default: return status;
    }
  }

  async function loadAnalytics(p: PeriodKey) {
    setAnalyticsLoading(true);
    try {
      const qs = new URLSearchParams({ period: p, ...(viewAs ? { viewAs } : {}) });
      const res = await fetch(`/api/dashboard/analytics?${qs}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  }

  type CallsResponse = {
    calls: CallItem[];
    nextCursor: string | null;
    total: number | null;
    stats: { averageScore: number; saleRate: number; failedCalls: number } | null;
    chartData: ChartBucket[] | null;
  };

  function applyStats(res: Pick<CallsResponse, "stats" | "chartData">) {
    if (res.stats) {
      setAverageScore(res.stats.averageScore);
      setSaleRate(res.stats.saleRate);
      setFailedCalls(res.stats.failedCalls);
    }
    if (res.chartData) setChartData(res.chartData);
  }

  async function loadCallsForPeriod(p: PeriodKey) {
    const qs = new URLSearchParams({ limit: "30", ...(p !== "all" ? { period: p } : {}), ...(viewAs ? { viewAs } : {}) });
    const res = await fetch(`/api/calls?${qs}`, { cache: "no-store" });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) return;
    const data: CallsResponse = await res.json();
    setCalls(data.calls);
    setNextCursor(data.nextCursor);
    if (data.total != null) setTotalCalls(data.total);
    applyStats(data);
  }

  // Loads the first page and merges into state (preserving older calls already scrolled in).
  async function loadCalls() {
    const p = periodRef.current;
    const qs = new URLSearchParams({ limit: "30", ...(p !== "all" ? { period: p } : {}), ...(viewAs ? { viewAs } : {}) });
    const res = await fetch(`/api/calls?${qs}`, { cache: "no-store" });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) return;
    const data: CallsResponse = await res.json();
    setCalls((prev) => {
      const freshIds = new Set(data.calls.map((c) => c.id));
      const extra    = prev.filter((c) => !freshIds.has(c.id));
      return [...data.calls, ...extra];
    });
    setNextCursor(data.nextCursor);
    if (data.total != null) setTotalCalls(data.total);
    applyStats(data);
  }

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams({ cursor: nextCursor, limit: "30", ...(period !== "all" ? { period } : {}), ...(viewAs ? { viewAs } : {}) });
      const res = await fetch(`/api/calls?${qs}`);
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) return;
      const { calls: more, nextCursor: nc }: { calls: CallItem[]; nextCursor: string | null } =
        await res.json();
      setCalls((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        return [...prev, ...more.filter((c) => !ids.has(c.id))];
      });
      setNextCursor(nc);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  // Wire up IntersectionObserver on the sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadMore]);

  function startProcessing(callId: string) {
    // Fire-and-forget — any HTTP error is intentionally swallowed here because:
    // 1. processCall already marks the call 'failed' in the DB on error.
    // 2. loadCalls() polls every 3 s and will reflect the updated status.
    // Awaiting or propagating the error would cause spurious console noise.
    fetch(`/api/calls/${callId}/process`, { method: "POST" }).catch(() => undefined);
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const audio = Array.from(incoming).filter(
      (f) => f.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|flac|aac|wma)$/i.test(f.name),
    );
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...audio.filter((f) => !names.has(f.name))];
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files);
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("reportType", reportType);
        if (selectedProfileId) formData.append("salesProfileId", selectedProfileId);
        const res = await fetch("/api/calls/upload", { method: "POST", body: formData });

        // Guard against HTML error pages (Next.js 500, 413, auth redirects, etc.)
        // that would make res.json() throw "Unexpected token '<'".
        const isJson = (res.headers.get("content-type") ?? "").includes("application/json");
        const data: { id?: string; error?: string; planId?: string } = isJson
          ? await res.json()
          : {};

        if (!res.ok) {
          const msg = data.error === "minute_limit_exceeded"
            ? t.errors.minuteLimitExceeded
            : data.error || t.dashboard.uploadSection.somethingWentWrong;
          throw new Error(msg);
        }
        if (data.id) startProcessing(data.id);
      }
      setFiles([]);
      await loadCalls();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t.dashboard.uploadSection.somethingWentWrong);
    } finally {
      setIsUploading(false);
    }
  }

  async function handlePeriodChange(p: PeriodKey) {
    setPeriod(p);
    periodRef.current = p;
    await Promise.all([loadCallsForPeriod(p), loadAnalytics(p)]);
  }

  useEffect(() => {
    // Initial load with default period ("month")
    void loadCalls();
    void loadAnalytics("today");
    const id = window.setInterval(() => void loadCalls(), 3000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCalls = filterProfileId
    ? calls.filter((c) => c.salesProfileId === filterProfileId)
    : calls;

  const sortedCalls = sortCalls(filteredCalls, sortKey, sortDir);


  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      {/* Page header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t.dashboard.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.dashboard.subtitle}</p>
      </div>

      {/* ── Tab nav + period filter ── */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {([
            { id: "calls"    as const, label: t.dashboard.tabs.calls   },
            { id: "owner"    as const, label: t.dashboard.tabs.owner   },
            { id: "marketer" as const, label: t.dashboard.tabs.marketer },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                activeTab === id
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", "month", "week", "3days", "today"] as PeriodKey[]).map((key) => (
            <button
              key={key}
              onClick={() => void handlePeriodChange(key)}
              disabled={analyticsLoading}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                period === key
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.dashboard.periods[key]}
            </button>
          ))}
          {analyticsLoading && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 size={12} className="animate-spin" />
              {t.dashboard.updating}
            </span>
          )}
        </div>
      </div>

      {/* ── Owner dashboard ── */}
      {activeTab === "owner" && (
        <OwnerDashboard data={analyticsData.ownerAnalytics} lang={lang} t={t} />
      )}

      {/* ── Marketer dashboard ── */}
      {activeTab === "marketer" && (
        <MarketerDashboard data={analyticsData.marketerAnalytics} t={t} />
      )}

      {/* ── Calls tab (existing functionality) ── */}
      {activeTab === "calls" && <>

      {/* Upload section */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:mb-8 md:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </span>
          {t.dashboard.uploadSection.title}
        </h2>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors md:p-10 ${
            isDragging
              ? "border-brand-400 bg-brand-50"
              : "border-slate-200 hover:border-brand-300 hover:bg-brand-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,audio/*"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">{t.dashboard.uploadSection.dropzoneHint}</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-600">
              {t.dashboard.uploadSection.selectedFiles} ({files.length})
            </p>
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 text-sm">
                  <span className="truncate pr-4 text-slate-700">{f.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button onClick={() => removeFile(i)} aria-label={t.dashboard.uploadSection.remove} className="text-slate-400 hover:text-red-500 transition-colors p-1 -m-1 sm:p-0 sm:m-0">
                      <X className="h-5 w-5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-auto"
          >
            <option value="high_level">{t.dashboard.reportTypes.high_level}</option>
            <option value="medium"   disabled={isFree}>{t.dashboard.reportTypes.medium}{isFree ? " 🔒" : ""}</option>
            <option value="detailed" disabled={isFree || isStarter}>{t.dashboard.reportTypes.detailed}{(isFree || isStarter) ? " 🔒" : ""}</option>
          </select>

          {profiles.length > 0 && (
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-auto"
            >
              <option value="">{t.profiles.noManager}</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.description ? ` · ${p.description}` : ""}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="w-full rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors sm:w-auto"
          >
            {isUploading ? t.dashboard.uploadSection.uploading : t.dashboard.uploadSection.uploadButton}
          </button>
        </div>

        {uploadError && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}
      </section>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          { label: t.dashboard.stats.totalCalls, value: totalCalls, unit: "" },
          { label: t.dashboard.stats.averageScore, value: averageScore, unit: "/10" },
          { label: t.dashboard.stats.conversionRate, value: saleRate, unit: "%" },
          { label: t.dashboard.stats.errors, value: failedCalls, unit: "" },
        ].map(({ label, value, unit }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 leading-tight">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-brand-600 md:mt-2 md:text-3xl">
              {value}
              {unit && <span className="ml-0.5 text-sm font-medium text-slate-400 md:text-base">{unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Calls chart */}
      {chartData.length > 0 && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            {period === "today" ? t.dashboard.chart.titleToday : t.dashboard.chart.titlePeriod}
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1C78AE" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1C78AE" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(val, name) => {
                  const labels: Record<string, string> = {
                    total:     t.dashboard.chart.legendTotal,
                    completed: t.dashboard.chart.legendCompleted,
                    failed:    t.dashboard.chart.legendFailed,
                  };
                  const key = String(name ?? "");
                  return [val, labels[key] ?? key];
                }}
              />
              <Area type="monotone" dataKey="total"     stroke="#1C78AE" strokeWidth={2} fill="url(#gradTotal)"     dot={false} />
              <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={1.5} fill="url(#gradCompleted)" dot={false} />
              <Area type="monotone" dataKey="failed"    stroke="#ef4444" strokeWidth={1.5} fill="none"               dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" />{t.dashboard.chart.legendTotal}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t.dashboard.chart.legendCompleted}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" />{t.dashboard.chart.legendFailed}</span>
          </div>
        </section>
      )}

      {/* Calls table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-6 md:py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 md:text-lg">{t.dashboard.table.title}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{t.dashboard.table.autoUpdate}</p>
          </div>

          {profiles.length > 0 && (
            <select
              value={filterProfileId}
              onChange={(e) => setFilterProfileId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">{t.profiles.allManagers}</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── Cards (< lg: mobile + tablet portrait) ── */}
        <div className="lg:hidden divide-y divide-slate-100">
          {sortedCalls.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-slate-400">{t.dashboard.table.noCallsYet}</p>
          )}
          {sortedCalls.map((call) => {
            const profile = profiles.find((p) => p.id === call.salesProfileId);
            return (
              <div key={call.id} className="px-4 py-3 hover:bg-slate-50 transition-colors sm:px-5">
                {/* Top row: filename + actions */}
                <div className="flex items-start gap-2">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    call.status === "completed" ? "bg-emerald-400" :
                    call.status === "failed"    ? "bg-red-400" :
                    call.status === "queued"    ? "bg-slate-300" :
                    "bg-brand-400 animate-pulse"
                  }`} />
                  <Link href={`/${lang}/calls/${call.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{call.fileName}</p>
                    {call.internalNumber && (
                      <p className="text-xs text-slate-400">{call.internalNumber}</p>
                    )}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link href={`/${lang}/calls/${call.id}`} aria-label={t.dashboard.table.view}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(call.id)} disabled={deletingId === call.id}
                      aria-label={t.admin.deleteCall}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40">
                      {deletingId === call.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Middle row: badges */}
                <div className="mt-1.5 ml-4 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusBadge status={call.status} label={getStatusLabel(call.status)} error={formatError(call.errorMessage)} />
                  {call.saleStatus && (
                    <SaleStatusBadge status={call.saleStatus} label={getSaleStatusLabel(call.saleStatus)} />
                  )}
                  {call.score !== null && (
                    <span className="text-xs font-semibold text-brand-600">
                      {call.score}<span className="font-normal text-slate-400">/10</span>
                    </span>
                  )}
                </div>

                {/* Bottom row: meta */}
                <div className="mt-1 ml-4 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  <span>{new Date(call.createdAt).toLocaleDateString(t.dateLocale)}</span>
                  {call.product && <span className="truncate max-w-[180px]">{call.product}</span>}
                  {getReportTypeLabel(call.reportType) && (
                    <span>{getReportTypeLabel(call.reportType)}</span>
                  )}
                  {profile && (
                    <span className="flex items-center gap-1">
                      <ProfileAvatar photo={profile.photo} name={profile.name} className="h-3.5 w-3.5" textClassName="text-[7px]" />
                      {profile.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex justify-center py-3">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-brand-400" />}
          </div>
        </div>

        {/* ── Desktop table (≥ lg) ── */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-brand-50">
                <SortableHeader col="createdAt"  label={t.dashboard.table.date}    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader col="fileName"   label={t.dashboard.table.file}    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-700">{t.dashboard.table.report}</th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-700 lg:table-cell">{t.profiles.manager}</th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-700 lg:table-cell">{t.callLanguage.label}</th>
                <SortableHeader col="product"    label={t.dashboard.table.product} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader col="saleStatus" label={t.dashboard.table.sale}    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader col="score"      label={t.dashboard.table.score}   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader col="status"     label={t.dashboard.table.status}  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCalls.map((call) => (
                <tr key={call.id} className="hover:bg-slate-50 transition-colors align-middle">
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                    <p className="text-xs text-slate-400">
                      {new Date(call.createdAt).toLocaleTimeString(t.dateLocale, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p>{new Date(call.createdAt).toLocaleDateString(t.dateLocale)}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-[180px]">
                    <p className="truncate">{call.fileName}</p>
                    {call.internalNumber && (
                      <p className="text-xs text-slate-400">{call.internalNumber}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {getReportTypeLabel(call.reportType)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm lg:table-cell">
                    {(() => {
                      const profile = profiles.find((p) => p.id === call.salesProfileId);
                      if (!profile) return <span className="text-slate-400">-</span>;
                      const isFiltered = filterProfileId === profile.id;
                      return (
                        <button onClick={() => setFilterProfileId(isFiltered ? "" : profile.id)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                          <ProfileAvatar photo={profile.photo} name={profile.name} className="h-6 w-6 border border-slate-200" textClassName="text-xs" />
                          <span className={isFiltered ? "font-semibold text-brand-700 underline" : "text-slate-700"}>{profile.name}</span>
                        </button>
                      );
                    })()}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-600 lg:table-cell">{getLanguageLabel(call.language)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{call.product || "-"}</td>
                  <td className="px-4 py-3"><SaleStatusBadge status={call.saleStatus} label={getSaleStatusLabel(call.saleStatus)} /></td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {call.score ? <span className="text-brand-600">{call.score}<span className="font-normal text-slate-400 text-xs">/10</span></span> : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={call.status} label={getStatusLabel(call.status)} error={formatError(call.errorMessage)} /></td>
                  <td className="px-4 py-3 w-10 text-center">
                    <Link href={`/${lang}/calls/${call.id}`} className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 w-10 text-center">
                    <button
                      onClick={() => handleDelete(call.id)}
                      disabled={deletingId === call.id}
                      aria-label={t.admin.deleteCall}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      {deletingId === call.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCalls.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">{t.dashboard.table.noCallsYet}</td></tr>
              )}
            </tbody>
          </table>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex justify-center py-3">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-brand-400" />}
          </div>
        </div>
      </section>
      </> /* end activeTab === "calls" */}

    </main>
  );
}
