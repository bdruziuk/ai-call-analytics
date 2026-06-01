"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

type Props = {
  t: Dictionary;
  lang: string;
  callbackUrl?: string;
};

export function SignInForm({ t, lang, callbackUrl }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirect = callbackUrl || `/${lang}/dashboard`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: redirect,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t.auth.errors.invalidCredentials);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl: redirect });
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <LogoMark size={52} />
          <h1 className="text-xl font-bold text-slate-900">{t.auth.signin}</h1>
        </div>

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

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                {t.auth.password}
              </label>
              <Link
                href={`/${lang}/auth/forgot-password`}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : t.auth.signinButton}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100" />
          <span className="text-xs text-slate-400">{t.auth.orContinueWith}</span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        <button
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <GoogleIcon />
          {t.auth.googleButton}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t.auth.noAccount}{" "}
          <Link
            href={`/${lang}/auth/register`}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            {t.auth.signupLink}
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M24 9.5c3.5 0 6.5 1.2 8.9 3.2l6.6-6.6C35.3 2.7 30 .5 24 .5 14.7.5 6.8 6 3 13.9l7.7 6C12.6 13.1 17.8 9.5 24 9.5z" />
      <path fill="#34A853" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.5-4.1 7.1-10.2 7.1-17.1z" />
      <path fill="#FBBC05" d="M10.7 28.4A14.7 14.7 0 0 1 9.5 24c0-1.5.3-3 .7-4.4L2.5 13.5A23.5 23.5 0 0 0 .5 24c0 3.8.9 7.4 2.5 10.6l7.7-6.2z" />
      <path fill="#EA4335" d="M24 47.5c6 0 11.1-2 14.8-5.4l-7.6-5.9c-2 1.4-4.6 2.2-7.2 2.2-6.2 0-11.4-3.6-13.3-9.4l-7.7 6C6.8 42 14.7 47.5 24 47.5z" />
    </svg>
  );
}
