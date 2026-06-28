"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import type ukDict from "@/dictionaries/uk.json";
import { ApiKeySection, type ApiKeyRecord } from "@/components/settings/ApiKeySection";
import { PlanSection } from "@/components/settings/PlanSection";
import { IntegrationSetupSection } from "@/components/settings/IntegrationSetupSection";
import { BusinessTypeSection } from "@/components/settings/BusinessTypeSection";
import type { BusinessType } from "@/lib/businessTypes";

type Dictionary = typeof ukDict;

type SubscriptionInfo = {
  planId: string;
  minutesUsed: number;
  minutesLimit: number;
  currentPeriodEnd: string;
  hasStripeSubscription: boolean;
};

type ConsentInfo = {
  analyticsAccepted: boolean;
  analyticsAcceptedAt: string | null;
  analyticsVersion: string | null;
  marketingAccepted: boolean;
  marketingAcceptedAt: string | null;
  marketingVersion: string | null;
};

type Props = {
  t: Dictionary;
  lang: string;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  apiKeys: ApiKeyRecord[];
  subscription: SubscriptionInfo;
  paymentStatus?: "success" | "cancelled" | null;
  isTestAccount?: boolean;
  consent?: ConsentInfo;
  binotelKey?: string | null;
  binotelSecret?: string | null;
  businessType?: BusinessType;
};

const languages = [
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

export function SettingsClient({ t, lang, user, apiKeys, subscription, paymentStatus, isTestAccount = false, consent, binotelKey, binotelSecret, businessType = "other" }: Props) {
  const router                      = useRouter();
  const [name, setName]             = useState(user.name ?? "");
  const [image, setImage]           = useState(user.image ?? "");
  const [saveState, setSaveState]   = useState<"idle" | "saving" | "saved">("idle");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef               = useRef<HTMLInputElement>(null);
  const pathname                    = usePathname();

  function buildLangHref(targetLang: string) {
    const segments = pathname.split("/");
    segments[1] = targetLang;
    return segments.join("/") || "/";
  }

  /** Resize + compress an image file client-side using a canvas. */
  function compressImage(file: File, maxPx = 512, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
          "image/jpeg",
          quality,
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
    try {
      // Resize + compress client-side before uploading (avoids 413 / large base64 in DB)
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed, "photo.jpg");
      const uploadRes = await fetch("/api/profiles/photo", { method: "POST", body: formData });
      if (!uploadRes.ok) return;
      const { url } = await uploadRes.json();

      // Persist URL on the user record
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });

      setImage(url);
      router.refresh(); // re-fetch server session with updated image
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: null }),
      });
      setImage("");
      router.refresh(); // re-fetch server session with cleared image
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
  }

  const initials = (user.name || user.email || "?")[0].toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-5">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-brand-900">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.settings.subtitle}</p>
      </div>

      {/* ── Profile card ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-600">
          {t.settings.profileSection}
        </h2>

        {/* Avatar row */}
        <div className="mb-6 flex items-center gap-4">
          {/* Avatar with upload overlay */}
          <div className="relative shrink-0 group">
            <ProfileAvatar
              photo={image || null}
              name={user.name || user.email || "?"}
              className="h-16 w-16 ring-2 ring-brand-300"
              textClassName="text-2xl font-bold"
            />

            {/* Camera overlay — visible on hover or while uploading */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
              title={t.settings.uploadPhoto}
            >
              {uploadingPhoto ? (
                <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div>
            <p className="font-semibold text-slate-900">{user.name || user.email}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors disabled:opacity-50"
              >
                {t.settings.uploadPhoto}
              </button>
              {image && (
                <>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                  >
                    {t.settings.removePhoto}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Display name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.settings.displayName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.settings.email}
            </label>
            <input
              type="email"
              value={user.email ?? ""}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={saveState === "saving"}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saveState === "saving"
              ? t.settings.saving
              : saveState === "saved"
                ? t.settings.saved
                : t.settings.saveChanges}
          </button>
        </form>
      </section>

      {/* ── Language card ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-600">
          {t.settings.languageSection}
        </h2>

        <div className="flex flex-col gap-2">
          {languages.map(({ code, label, flag }) => (
            <Link
              key={code}
              href={buildLangHref(code)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                lang === code
                  ? "border-brand-400 bg-brand-50 text-brand-800"
                  : "border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50/60"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base leading-none">{flag}</span>
                {label}
              </span>
              {lang === code && (
                <svg
                  className="h-4 w-4 text-brand-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Subscription / Plan card ───────────────────────────────────── */}
      <PlanSection
        t={t.settings}
        lang={lang}
        planId={subscription.planId}
        minutesUsed={subscription.minutesUsed}
        minutesLimit={subscription.minutesLimit}
        currentPeriodEnd={subscription.currentPeriodEnd}
        hasStripeSubscription={subscription.hasStripeSubscription}
        paymentStatus={paymentStatus ?? null}
      />

      {/* ── API Keys card ─────────────────────────────────────────────── */}
      <ApiKeySection
        t={t}
        initialKeys={apiKeys}
        locked={!isTestAccount && !["growth", "pro"].includes(subscription.planId)}
      />

      {/* ── Integration Setup card ─────────────────────────────────────── */}
      <IntegrationSetupSection apiKeys={apiKeys} binotelKey={binotelKey ?? null} binotelSecret={binotelSecret ?? null} t={t} />

      {/* ── Business Type card ─────────────────────────────────────────── */}
      <BusinessTypeSection t={t} initialBusinessType={businessType} />

      {/* ── Consent card ──────────────────────────────────────────────── */}
      {consent && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-slate-900">{t.consent.documentsTitle}</h2>

          <div className="space-y-4">
            {/* Required analytics consent */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{t.consent.analyticsConsentTitle}</p>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${consent.analyticsAccepted ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                  {consent.analyticsAccepted ? t.consent.statusAccepted : t.consent.statusNotAccepted}
                </span>
              </div>
              {consent.analyticsAccepted ? (
                <div className="space-y-1 text-xs text-slate-500">
                  {consent.analyticsAcceptedAt && (
                    <p>{t.consent.acceptedAt}: <span className="font-medium text-slate-700">{new Date(consent.analyticsAcceptedAt).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB")}</span></p>
                  )}
                  {consent.analyticsVersion && (
                    <p>{t.consent.version}: <span className="font-medium text-slate-700">{consent.analyticsVersion}</span></p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">{t.consent.notYetAccepted}</p>
              )}
            </div>

            {/* Optional marketing consent */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{t.consent.marketingConsentTitle}</p>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${consent.marketingAccepted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {consent.marketingAccepted ? t.consent.statusAccepted : t.consent.statusNotAccepted}
                </span>
              </div>
              {consent.marketingAccepted && (
                <div className="space-y-1 text-xs text-slate-500">
                  {consent.marketingAcceptedAt && (
                    <p>{t.consent.acceptedAt}: <span className="font-medium text-slate-700">{new Date(consent.marketingAcceptedAt).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB")}</span></p>
                  )}
                  {consent.marketingVersion && (
                    <p>{t.consent.version}: <span className="font-medium text-slate-700">{consent.marketingVersion}</span></p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Legal document links */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t.consent.legalDocuments}</p>
            <div className="flex flex-wrap gap-2">
              <a href="/uk/legal/data-consent" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-700">
                {t.consent.docLinkUk}
              </a>
              <a href="/en/legal/data-consent" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-700">
                {t.consent.docLinkEn}
              </a>
              <a href="/ru/legal/data-consent" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-700">
                {t.consent.docLinkRu}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── Sign-out card ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={() => signOut({ callbackUrl: `/${lang}/auth/signin` })}
          className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          {t.auth.signout}
        </button>
      </section>
    </div>
  );
}
