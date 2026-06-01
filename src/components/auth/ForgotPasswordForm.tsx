"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

type Props = {
  t: Dictionary;
  lang: string;
};

export function ForgotPasswordForm({ t, lang }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), lang }),
      });

      if (!res.ok) throw new Error("SERVER_ERROR");
      setSent(true);
    } catch {
      setError(t.auth.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <LogoMark size={52} />
          <h1 className="text-xl font-bold text-slate-900">
            {t.auth.forgotPasswordTitle}
          </h1>
        </div>

        {sent ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {t.auth.forgotPasswordSent}
            </p>
            <Link
              href={`/${lang}/auth/signin`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft size={14} />
              {t.auth.backToSignin}
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <p className="mb-5 text-sm leading-relaxed text-slate-500">
              {t.auth.forgotPasswordDesc}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {t.auth.email}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "..." : t.auth.forgotPasswordButton}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              <Link
                href={`/${lang}/auth/signin`}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700"
              >
                <ArrowLeft size={14} />
                {t.auth.backToSignin}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
