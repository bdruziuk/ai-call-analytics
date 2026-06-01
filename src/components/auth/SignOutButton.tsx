"use client";

import { signOut } from "next-auth/react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

export function SignOutButton({ t, lang }: { t: Dictionary; lang: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: `/${lang}/auth/signin` })}
      className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-400 hover:text-brand-900 transition-colors"
    >
      {t.auth.signout}
    </button>
  );
}
