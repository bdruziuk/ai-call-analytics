"use client";

import { useState } from "react";
import { BUSINESS_TYPES, BUSINESS_TYPE_LABELS, type BusinessType } from "@/lib/businessTypes";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

type Props = {
  t: Dictionary;
  initialBusinessType: BusinessType;
};

export function BusinessTypeSection({ t, initialBusinessType }: Props) {
  const [value, setValue]   = useState<BusinessType>(initialBusinessType);
  const [state, setState]   = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    setState("saving");
    try {
      const res = await fetch("/api/user", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ businessType: value }),
      });
      setState(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
    }
  }

  const bt = t.settings.businessType;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-600">
        {bt.sectionTitle}
      </h2>
      <p className="mb-5 text-sm text-slate-500">{bt.sectionDesc}</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            {bt.label}
          </label>
          <select
            value={value}
            onChange={(e) => { setValue(e.target.value as BusinessType); setState("idle"); }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt} value={bt}>{BUSINESS_TYPE_LABELS[bt]}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={state === "saving"}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60 sm:shrink-0"
        >
          {state === "saving" ? bt.saving :
           state === "saved"  ? bt.saved  :
           state === "error"  ? bt.error  :
           bt.save}
        </button>
      </div>

      {value !== "other" && (
        <p className="mt-3 text-xs text-slate-400">{bt.hint}</p>
      )}
    </section>
  );
}
