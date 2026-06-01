"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { CheckCircle2, ArrowLeft, AlertTriangle } from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

type Props = {
  t: Dictionary;
  lang: string;
  token: string | null;
};

export function ResetPasswordForm({ t, lang, token }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-3">
            <LogoMark size={52} />
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <p className="text-sm text-slate-600">{t.auth.resetPasswordExpired}</p>
            <Link
              href={`/${lang}/auth/forgot-password`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft size={14} />
              {t.auth.forgotPasswordTitle}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t.auth.errors.passwordMismatch);
      return;
    }

    if (password.length < 6) {
      setError(t.auth.errors.passwordTooShort);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "TOKEN_INVALID") {
          setError(t.auth.resetPasswordExpired);
        } else if (data.error === "PASSWORD_TOO_SHORT") {
          setError(t.auth.errors.passwordTooShort);
        } else {
          setError(t.auth.errors.generic);
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/${lang}/auth/signin`), 2500);
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
            {t.auth.resetPasswordTitle}
          </h1>
        </div>

        {success ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {t.auth.resetPasswordSuccess}
            </p>
            <p className="text-xs text-slate-400">{t.auth.redirecting}</p>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t.auth.newPassword}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t.auth.confirmPassword}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
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
              {loading ? "..." : t.auth.resetPasswordButton}
            </button>

            <p className="text-center">
              <Link
                href={`/${lang}/auth/signin`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                <ArrowLeft size={14} />
                {t.auth.backToSignin}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
