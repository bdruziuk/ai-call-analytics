"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

type CallRow = {
  id: string;
  userId: string | null;
  externalId: string | null;
  fileName: string;
  source: string;
  status: string;
  score: number | null;
  durationSeconds: number | null;
  internalNumber: string | null;
  salesProfileId: string | null;
  createdAt: string;
  user: { email: string | null; name: string | null } | null;
};

type DupGroup = CallRow[];

type Data = {
  totalCalls: number;
  noExternalId: number;
  dupsByExternalId: DupGroup[];
  dupsByFileName: DupGroup[];
  dupsBySignature: DupGroup[];
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function diffMinutes(a: string, b: string) {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

function DupTable({ groups, label }: { groups: DupGroup[]; label: string }) {
  if (groups.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <CheckCircle2 size={15} />
        {label}: дублікатів не знайдено
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-3">
        <AlertTriangle size={14} className="text-red-500" />
        <h2 className="text-sm font-bold text-red-800">{label}</h2>
        <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
          {groups.length} груп / {groups.reduce((s, g) => s + g.length, 0)} дзвінків
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {groups.map((group, gi) => {
          const first = group[0];
          const userLabel = first.user?.email ?? first.userId ?? "?";
          return (
            <div key={gi} className="px-5 py-4">
              <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{userLabel}</span>
                {first.externalId && (
                  <span>externalId: <code className="rounded bg-slate-100 px-1">{first.externalId}</code></span>
                )}
                {first.internalNumber && (
                  <span>внутрішній №: <code className="rounded bg-slate-100 px-1">{first.internalNumber}</code></span>
                )}
                <span>тривалість: {first.durationSeconds}с</span>
                <span>оцінка: {first.score ?? "—"}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 uppercase tracking-wide">
                      <th className="pb-1 pr-4">createdAt</th>
                      <th className="pb-1 pr-4">status</th>
                      <th className="pb-1 pr-4">source</th>
                      <th className="pb-1 pr-4">fileName</th>
                      <th className="pb-1 pr-4">+хв від попереднього</th>
                      <th className="pb-1">id</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {group.map((c, ci) => (
                      <tr key={c.id} className={ci > 0 ? "bg-red-50/40" : ""}>
                        <td className="py-1 pr-4 font-mono whitespace-nowrap">{fmt(c.createdAt)}</td>
                        <td className="py-1 pr-4">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${c.status === "done" ? "bg-emerald-100 text-emerald-700" : c.status === "processing" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-1 pr-4 text-slate-500">{c.source}</td>
                        <td className="py-1 pr-4 font-mono text-slate-500 max-w-[200px] truncate" title={c.fileName}>{c.fileName}</td>
                        <td className="py-1 pr-4 font-semibold text-red-600">
                          {ci > 0 ? `+${diffMinutes(group[ci - 1].createdAt, c.createdAt)} хв` : "—"}
                        </td>
                        <td className="py-1 font-mono text-slate-300 text-[10px]">{c.id.slice(0, 8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function DuplicatesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/duplicates");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Діагностика дублікатів дзвінків</h1>
            <p className="mt-0.5 text-sm text-slate-500">Аналіз всіх дзвінків у базі</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Оновити
          </button>
        </div>

        {loading && !data && (
          <div className="py-12 text-center text-sm text-slate-400">Завантаження…</div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Всього дзвінків", value: data.totalCalls, color: "text-slate-900" },
                { label: "Без externalId", value: data.noExternalId, color: data.noExternalId > 0 ? "text-amber-600" : "text-emerald-600" },
                { label: "Дублі за externalId", value: data.dupsByExternalId.length, color: data.dupsByExternalId.length > 0 ? "text-red-600" : "text-emerald-600" },
                { label: "Дублі за підписом", value: data.dupsBySignature.length, color: data.dupsBySignature.length > 0 ? "text-red-600" : "text-emerald-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <DupTable groups={data.dupsByExternalId} label="Дублікати за externalId (generalCallID)" />
            <DupTable groups={data.dupsByFileName}   label="Дублікати за fileName" />
            <DupTable groups={data.dupsBySignature}  label="Дублікати за підписом (score + duration + internalNumber)" />
          </>
        )}
      </div>
    </main>
  );
}
