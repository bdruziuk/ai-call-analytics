"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type ukDict from "@/dictionaries/uk.json";
import { ProfileAvatar } from "@/components/ProfileAvatar";

type Dictionary = typeof ukDict;

type CallStat = {
  score: number | null;
  saleStatus: string | null;
  createdAt: string; // serialised Date
};

type Profile = {
  id: string;
  name: string;
  description: string | null;
  photo: string | null;
  calls: CallStat[];
  _count: { calls: number };
};

type Props = {
  t: Dictionary;
  lang: string;
  initialProfiles: Profile[];
  maxManagers: number | null; // null = unlimited
};

const EMPTY = { name: "", description: "", photo: "" };

/* ─────────────────────────────────────────────────────────────────────────────
   Score sparkline  — pure SVG, no external library
   ───────────────────────────────────────────────────────────────────────────── */
function ScoreSparkline({ scores, id }: { scores: number[]; id: string }) {
  if (scores.length < 2) return null;

  const W = 240, H = 44, PAD = 3;
  const gradId = `spk-${id}`;

  const xi = (i: number) =>
    PAD + (i / (scores.length - 1)) * (W - 2 * PAD);
  const yi = (s: number) =>
    H - PAD - (Math.max(0, Math.min(10, s)) / 10) * (H - 2 * PAD);

  const linePts = scores.map((s, i) => `${xi(i).toFixed(1)},${yi(s).toFixed(1)}`).join(" ");
  const areaPts = [
    `${xi(0).toFixed(1)},${H}`,
    ...scores.map((s, i) => `${xi(i).toFixed(1)},${yi(s).toFixed(1)}`),
    `${xi(scores.length - 1).toFixed(1)},${H}`,
  ].join(" ");

  const lastX = xi(scores.length - 1);
  const lastY = yi(scores[scores.length - 1]);

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1C78AE" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1C78AE" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon points={areaPts} fill={`url(#${gradId})`} />
      {/* Trend line */}
      <polyline
        points={linePts}
        fill="none"
        stroke="#1C78AE"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest-point dot (not distorted by preserveAspectRatio, just a visual accent) */}
      <circle cx={lastX} cy={lastY} r="2.8" fill="#1C78AE" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sale-status breakdown  — segmented bar + legend
   ───────────────────────────────────────────────────────────────────────────── */
function SaleBreakdown({ calls, t }: { calls: CallStat[]; t: Dictionary }) {
  const withStatus = calls.filter((c) => c.saleStatus);
  if (withStatus.length === 0) return null;

  const sold      = withStatus.filter((c) => c.saleStatus === "sold").length;
  const potential = withStatus.filter((c) => c.saleStatus === "potential_sale").length;
  const notSold   = withStatus.filter((c) => c.saleStatus === "not_sold").length;
  const total     = sold + potential + notSold;

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div>
      {/* Segmented bar */}
      <div className="flex h-1.5 overflow-hidden rounded-full gap-[2px]">
        {sold > 0 && (
          <div
            style={{ width: pct(sold) }}
            className="bg-emerald-400 rounded-l-full"
            title={`${t.dashboard.saleStatus.sold}: ${sold}`}
          />
        )}
        {potential > 0 && (
          <div
            style={{ width: pct(potential) }}
            className="bg-amber-400"
            title={`${t.dashboard.saleStatus.potential_sale}: ${potential}`}
          />
        )}
        {notSold > 0 && (
          <div
            style={{ width: pct(notSold) }}
            className="bg-red-400 rounded-r-full"
            title={`${t.dashboard.saleStatus.not_sold}: ${notSold}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
        {sold > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t.dashboard.saleStatus.sold} · {pct(sold)}
          </span>
        )}
        {potential > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {t.dashboard.saleStatus.potential_sale} · {pct(potential)}
          </span>
        )}
        {notSold > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            {t.dashboard.saleStatus.not_sold} · {pct(notSold)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────────────────────── */
export function ProfilesClient({ t, lang, initialProfiles, maxManagers }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const atLimit = maxManagers !== null && profiles.length >= maxManagers;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const tp = t.profiles;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? "", photo: p.photo ?? "" });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
    setError(null);
  }

  function compressImage(file: File, maxPx = 512, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
          "image/jpeg", quality,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
      img.src = url;
    });
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const data = new FormData();
      data.append("file", compressed, "photo.jpg");
      const res = await fetch("/api/profiles/photo", { method: "POST", body: data });
      if (!res.ok) { setError(t.dashboard.uploadSection.somethingWentWrong); return; }
      const { url } = await res.json();
      setForm((f) => ({ ...f, photo: url }));
      e.target.value = "";
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError(tp.namePlaceholder); return; }
    setSaving(true);
    setError(null);
    const url    = editing ? `/api/profiles/${editing.id}` : "/api/profiles";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setError(t.dashboard.uploadSection.somethingWentWrong); return; }
    const data = await res.json();
    if (editing) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...data, calls: p.calls, _count: { calls: p._count.calls } } : p,
        ),
      );
    } else {
      setProfiles((prev) => [...prev, { ...data, calls: [], _count: { calls: 0 } }]);
    }
    closeForm();
  }

  async function handleDelete(p: Profile) {
    if (!window.confirm(tp.deleteConfirm)) return;
    await fetch(`/api/profiles/${p.id}`, { method: "DELETE" });
    setProfiles((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{tp.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{tp.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={openCreate}
            disabled={atLimit}
            title={atLimit && maxManagers !== null ? `${profiles.length} / ${maxManagers}` : undefined}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {tp.addProfile}
          </button>
          {maxManagers !== null && (
            <p className={`text-xs ${atLimit ? "text-red-500 font-medium" : "text-slate-400"}`}>
              {profiles.length} / {maxManagers}
            </p>
          )}
        </div>
      </div>

      {/* ── Create / Edit form ───────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-slate-900">
            {editing ? tp.editProfile : tp.addProfile}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{tp.name} *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={tp.namePlaceholder}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{tp.description}</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={tp.descriptionPlaceholder}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            {/* Photo upload */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{tp.photo}</label>
              <div className="flex items-center gap-4">
                <ProfileAvatar photo={form.photo || null} name={form.name || "?"} className="h-16 w-16 border-2 border-brand-100" textClassName="text-xl" />

                <div className="flex flex-wrap items-center gap-2">
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    {uploadingPhoto ? (
                      <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    {uploadingPhoto ? "..." : tp.uploadPhoto}
                  </button>
                  {form.photo && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, photo: "" }))}
                      className="text-sm text-red-500 transition-colors hover:text-red-700 hover:underline"
                    >
                      {tp.removePhoto}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || uploadingPhoto}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "..." : tp.save}
            </button>
            <button
              onClick={closeForm}
              className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {tp.cancel}
            </button>
          </div>
        </div>
      )}

      {/* ── Profile grid ─────────────────────────────────────────────────── */}
      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg className="h-7 w-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-slate-500">{tp.noProfiles}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => {
            // ── Derived stats ──────────────────────────────────────────
            const scores = p.calls
              .filter((c) => c.score !== null)
              .map((c) => c.score!)
              .slice(-12); // last 12 scored calls

            const avgScore =
              scores.length > 0
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                : null;

            const bestScore = scores.length > 0 ? Math.max(...scores) : null;

            const withStatus = p.calls.filter((c) => c.saleStatus);
            const soldCount  = withStatus.filter((c) => c.saleStatus === "sold").length;
            const convPct    = withStatus.length > 0
              ? Math.round((soldCount / withStatus.length) * 100)
              : null;

            const hasChart = scores.length >= 2 || withStatus.length > 0;

            return (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
              >
                {/* ── Identity row ──────────────────────────────────── */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProfileAvatar photo={p.photo} name={p.name} className="h-11 w-11 border-2 border-brand-100" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{p.name}</p>
                      {p.description && (
                        <p className="truncate text-sm text-slate-500">{p.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                    {p._count.calls} {tp.callsCount}
                  </span>
                </div>

                {/* ── Analytics chart section ───────────────────────── */}
                {hasChart && (
                  <div className="mb-4 flex-1 rounded-xl bg-slate-50 px-3 pt-2.5 pb-3 space-y-3">

                    {/* Score sparkline */}
                    {scores.length >= 2 && (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                          <span>{t.dashboard.table.score}</span>
                          <span className="text-brand-600 font-semibold text-xs normal-case tracking-normal">
                            {avgScore !== null && (
                              <span title={t.dashboard.stats.averageScore}>
                                ø {avgScore}
                                {bestScore !== null && bestScore !== avgScore && (
                                  <span className="ml-2 text-slate-400">↑ {bestScore}</span>
                                )}
                              </span>
                            )}
                          </span>
                        </div>
                        <ScoreSparkline scores={scores} id={p.id} />
                      </div>
                    )}

                    {/* Sale breakdown bar */}
                    {withStatus.length > 0 && (
                      <div>
                        {convPct !== null && (
                          <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                            <span>{t.dashboard.stats.conversionRate}</span>
                            <span className="text-emerald-600 font-semibold text-xs normal-case tracking-normal">
                              {convPct}%
                            </span>
                          </div>
                        )}
                        <SaleBreakdown calls={p.calls} t={t} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Action buttons ────────────────────────────────── */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/${lang}/dashboard?manager=${p.id}`}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
                  >
                    {tp.viewCalls}
                  </Link>
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {tp.editProfile}
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {tp.deleteProfile}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
