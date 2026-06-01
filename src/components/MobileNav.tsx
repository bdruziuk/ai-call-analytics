"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  items: NavItem[];
};

export function MobileNav({ items }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="rounded-lg p-2 text-brand-800 hover:bg-brand-400 transition-colors"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-down drawer */}
      {open && (
        <nav className="absolute left-0 right-0 top-full z-30 border-b border-brand-400 bg-brand-300 shadow-lg">
          <ul className="divide-y divide-brand-400/50">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-6 py-4 text-sm font-semibold text-brand-900 hover:bg-brand-400 transition-colors"
                >
                  <span className="shrink-0 text-brand-700">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
