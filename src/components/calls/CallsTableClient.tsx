"use client";

import Link from "next/link";
import { Eye, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

export type CallRow = {
  id: string;
  fileName: string;
  status: string;
  product: string | null;
  saleStatus: string | null;
  score: number | null;
  createdAt: string; // ISO string (serialised from server)
  salesProfileId: string | null;
};

type Profile = { id: string; name: string };

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

function sortRows(arr: CallRow[], key: SortKey, dir: SortDir): CallRow[] {
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
function StatusBadge({ status, label }: { status: string; label: string }) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium";
  const map: Record<string, string> = {
    queued:      "bg-slate-100 text-slate-600",
    transcribing:"bg-brand-100 text-brand-700",
    analyzing:   "bg-brand-100 text-brand-700",
    completed:   "bg-emerald-100 text-emerald-700",
    failed:      "bg-red-100 text-red-700",
  };
  const pulse = status === "transcribing" || status === "analyzing";
  return (
    <span className={`${base} ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />}
      {label}
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

/* ── Component ── */
type Props = {
  t: Dictionary;
  lang: string;
  initialCalls: CallRow[];
  initialNextCursor?: string | null;
  profiles: Profile[];
};

export function CallsTableClient({ t, lang, initialCalls, initialNextCursor = null, profiles }: Props) {
  const [calls, setCalls]           = useState<CallRow[]>(initialCalls);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading]       = useState(false);
  const sentinelRef                 = useRef<HTMLDivElement>(null);

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/calls?cursor=${encodeURIComponent(nextCursor)}&limit=30`);
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) return;
      const { calls: more, nextCursor: nc }: { calls: CallRow[]; nextCursor: string | null } = await res.json();
      setCalls((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        return [...prev, ...more.filter((c) => !ids.has(c.id))];
      });
      setNextCursor(nc);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

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

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function getSaleStatusLabel(status?: string | null) {
    switch (status) {
      case "sold":           return t.calls.saleStatus.sold;
      case "not_sold":       return t.calls.saleStatus.not_sold;
      case "potential_sale": return t.calls.saleStatus.potential_sale;
      default: return "-";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "queued":       return t.dashboard.processingStatus.queued;
      case "transcribing": return t.dashboard.processingStatus.transcribing;
      case "analyzing":    return t.dashboard.processingStatus.analyzing;
      case "completed":    return t.dashboard.processingStatus.completed;
      case "failed":       return t.dashboard.processingStatus.failed;
      default: return status;
    }
  }

  function getProfileName(profileId: string | null): string {
    if (!profileId) return "-";
    return profiles.find((p) => p.id === profileId)?.name ?? "-";
  }

  const sortedCalls = sortRows(calls, sortKey, sortDir);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-brand-50">
            <SortableHeader col="createdAt"  label={t.calls.date}        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader col="fileName"   label={t.calls.file}        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-700">{t.profiles.manager}</th>
            <SortableHeader col="product"    label={t.calls.product}     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader col="saleStatus" label={t.calls.sale}        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader col="score"      label={t.calls.score}       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader col="status"     label={t.calls.status}      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {sortedCalls.map((call) => (
            <tr key={call.id} className="hover:bg-slate-50 transition-colors align-middle">
              <td className="px-4 py-3 text-sm text-slate-600">
                {new Date(call.createdAt).toLocaleDateString(t.dateLocale)}
              </td>

              <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-[180px] truncate">
                {call.fileName}
              </td>

              <td className="px-4 py-3 text-sm text-slate-600">
                {getProfileName(call.salesProfileId)}
              </td>

              <td className="px-4 py-3 text-sm text-slate-600">{call.product || "-"}</td>

              <td className="px-4 py-3">
                <SaleStatusBadge status={call.saleStatus} label={getSaleStatusLabel(call.saleStatus)} />
              </td>

              <td className="px-4 py-3 text-sm font-semibold">
                {call.score
                  ? <span className="text-brand-600">{call.score}<span className="font-normal text-slate-400 text-xs">/10</span></span>
                  : <span className="text-slate-400">-</span>
                }
              </td>

              <td className="px-4 py-3">
                <StatusBadge status={call.status} label={getStatusLabel(call.status)} />
              </td>

              <td className="px-4 py-3 w-10 text-center">
                <Link
                  href={`/${lang}/calls/${call.id}`}
                  title={t.calls.view}
                  className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}

          {calls.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                {t.calls.noCallsYet}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-brand-400" />}
      </div>
    </div>
  );
}
