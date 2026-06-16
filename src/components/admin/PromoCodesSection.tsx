"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Trash2, Plus, Tag, RefreshCw } from "lucide-react";
import { PLAN_ORDER, PLAN_META_ADMIN } from "@/lib/plans";

/* ── Types ───────────────────────────────────────────────────────────────── */

export type PromoCodeRecord = {
  id:        string;
  code:      string;
  planId:    string;
  createdBy: string;
  usedBy:    string | null;
  usedAt:    string | null;
  createdAt: string;
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const PLAN_COLORS = PLAN_META_ADMIN as Record<string, { bg: string; text: string; label: string }>;

function PlanBadge({ planId }: { planId: string }) {
  const meta = PLAN_COLORS[planId] ?? PLAN_COLORS.free;
  return (
    <span
      className="inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: meta.bg, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy code"
      className="ml-1 inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-slate-700 hover:bg-slate-50 transition-colors"
    >
      <code className="tracking-wider">{code}</code>
      {copied
        ? <Check size={11} className="text-emerald-500" />
        : <Copy size={11} className="text-slate-400" />}
    </button>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* ── Main component ──────────────────────────────────────────────────────── */

type Props = {
  initialCodes: PromoCodeRecord[];
};

export function PromoCodesSection({ initialCodes }: Props) {
  const [codes,    setCodes]    = useState<PromoCodeRecord[]>(initialCodes);
  const [planId,   setPlanId]   = useState<string>("starter");
  const [creating, setCreating] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  /* ── Create code ── */
  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const created: PromoCodeRecord = await res.json();
      setCodes((prev) => [created, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  /* ── Delete code ── */
  async function handleDelete(id: string) {
    if (!confirm("Delete this promo code?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "ALREADY_USED") {
          alert("Cannot delete — this code has already been redeemed.");
        }
        return;
      }
      setCodes((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  /* ── Refresh ── */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      if (res.ok) {
        const { codes: fresh } = await res.json();
        setCodes(fresh);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const available = codes.filter((c) => !c.usedBy).length;
  const used      = codes.filter((c) =>  c.usedBy).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <Tag size={16} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Promo Codes</h2>
            <p className="text-[11px] text-slate-400">
              {available} available · {used} redeemed
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Generate form ── */}
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Generate new code</p>
        <div className="flex flex-wrap items-end gap-3">
          {/* Plan selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Plan</label>
            <div className="flex flex-wrap gap-2">
              {PLAN_ORDER.map((id) => {
                const meta = PLAN_COLORS[id];
                return (
                  <button
                    key={id}
                    onClick={() => setPlanId(id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      planId === id
                        ? "ring-2 ring-offset-1 ring-brand-400"
                        : "border-slate-200 hover:border-brand-300"
                    }`}
                    style={planId === id
                      ? { background: meta.bg, color: meta.text, borderColor: meta.bg }
                      : {}}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Plus size={14} />
            {creating ? "Generating…" : "Generate Code"}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
      </div>

      {/* ── Codes table ── */}
      {codes.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Tag size={28} className="mx-auto mb-2 text-slate-200" />
          <p className="text-sm text-slate-400">No promo codes yet. Generate one above.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  {["Code", "Plan", "Status", "Created", "Used at", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((c) => (
                  <tr key={c.id} className={`transition-colors ${c.usedBy ? "bg-slate-50/50" : "hover:bg-slate-50/40"}`}>
                    <td className="px-4 py-3">
                      <CopyCode code={c.code} />
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge planId={c.planId} />
                    </td>
                    <td className="px-4 py-3">
                      {c.usedBy ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          ✓ Redeemed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                          ◎ Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmt(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {c.usedAt ? fmt(c.usedAt) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!c.usedBy && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          title="Delete code"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {codes.map((c) => (
              <div key={c.id} className={`px-4 py-4 ${c.usedBy ? "bg-slate-50/50" : ""}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <CopyCode code={c.code} />
                  <div className="flex items-center gap-2">
                    <PlanBadge planId={c.planId} />
                    {!c.usedBy && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                  <span>
                    {c.usedBy ? (
                      <span className="font-semibold text-emerald-600">✓ Redeemed {c.usedAt ? fmt(c.usedAt) : ""}</span>
                    ) : (
                      <span className="font-semibold text-brand-600">◎ Available</span>
                    )}
                  </span>
                  <span>Created {fmt(c.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
