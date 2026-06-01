"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const languages = [
  { code: "uk", label: "UA" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
];

export function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const pathname = usePathname();

  function buildHref(targetLang: string) {
    const segments = pathname.split("/");
    segments[1] = targetLang;
    return segments.join("/") || "/";
  }

  return (
    <div className="flex gap-1 rounded-lg bg-brand-400 p-0.5">
      {languages.map(({ code, label }) => (
        <Link
          key={code}
          href={buildHref(code)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
            currentLang === code
              ? "bg-white text-brand-700 shadow-sm"
              : "text-brand-900 hover:bg-brand-500 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
