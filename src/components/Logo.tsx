import Link from "next/link";

/* ─────────────────────────────────────────────────────────────────────────────
   AI Call Analytics — brand logo
   Icon: stylised "A" with embedded audio waveform
   Gradient: brand-400 (#63AED9) → brand-600 (#1C78AE) → brand-800 (#104A6D)
   Adapted from the ai-call-analytics-logo SVG (900×520 canvas).
   viewBox is cropped to the icon bounds only (no background, no text).
   ───────────────────────────────────────────────────────────────────────────── */

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="240 55 420 390"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Main A body — site brand palette */}
        <linearGradient
          id="lm-a-grad"
          x1="260" y1="72" x2="620" y2="430"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0"    stopColor="#63AED9" /> {/* brand-400 */}
          <stop offset="0.5"  stopColor="#1C78AE" /> {/* brand-600 */}
          <stop offset="1"    stopColor="#104A6D" /> {/* brand-800 */}
        </linearGradient>

        {/* Waveform bars — light so they pop on the gradient body */}
        <linearGradient
          id="lm-wave-grad"
          x1="303" y1="263" x2="602" y2="263"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0"    stopColor="#D0EBF8" /> {/* brand-100 */}
          <stop offset="0.45" stopColor="#FFFFFF" />
          <stop offset="1"    stopColor="#D0EBF8" /> {/* brand-100 */}
        </linearGradient>
      </defs>

      {/* ── Stylised "A" with built-in triangular counter ─────────────────── */}
      <path
        fillRule="evenodd"
        d="
          M451.5 72C463.2 72 473.9 78.5 479.4 88.8
          L641.5 391.5C650.8 408.9 638.2 430 618.5 430
          H554.9C544.8 430 535.5 424.3 531 415.2
          L498.6 349.6H400.8L368.8 415
          C364.4 424.1 355.1 430 344.9 430
          H283.4C263.8 430 251.2 409 260.4 391.7
          L423.4 88.7C428.9 78.5 439.7 72 451.5 72Z
          M451.2 183.6L416.2 271.4H484.6L451.2 183.6Z
        "
        fill="url(#lm-a-grad)"
      />

      {/* ── Subtle inner sheen (lower A body) ─────────────────────────────── */}
      <path
        d="M450.8 142L527.2 318H497.7L450.8 203.7L403.3 318H374.1L450.8 142Z"
        fill="white"
        opacity="0.1"
      />

      {/* ── Audio waveform ─────────────────────────────────────────────────── */}
      <g stroke="url(#lm-wave-grad)" strokeWidth="18" strokeLinecap="round">
        <path d="M303 263H352" />
        <path d="M374 238V288" />
        <path d="M410 215V311" />
        <path d="M448 197V329" />
        <path d="M486 223V303" />
        <path d="M522 242V284" />
        <path d="M548 263H602" />
      </g>
    </svg>
  );
}

/* ── Wordmark size presets ─────────────────────────────────────────────────── */
type LogoSize = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<LogoSize, { icon: number; title: string; sub: string; gap: string }> = {
  xs: { icon: 28, title: "text-sm",   sub: "text-[10px]", gap: "gap-2"   },
  sm: { icon: 32, title: "text-base", sub: "text-[11px]", gap: "gap-2.5" },
  md: { icon: 40, title: "text-lg",   sub: "text-xs",     gap: "gap-3"   },
  lg: { icon: 56, title: "text-2xl",  sub: "text-sm",     gap: "gap-4"   },
};

type LogoProps = {
  lang: string;
  size?: LogoSize;
  className?: string;
};

export function Logo({ lang, size = "md", className = "" }: LogoProps) {
  const { icon, title, sub, gap } = sizeMap[size];

  return (
    <Link href={`/${lang}`} className={`flex items-center ${gap} ${className}`}>
      <LogoMark size={icon} />
      <div className="leading-tight select-none">
        <p
          className={`${title} font-extrabold tracking-tight`}
          style={{ color: "#0B344E" }} /* brand-900 */
        >
          AI Call
        </p>
        <p
          className={`${sub} font-bold uppercase tracking-[0.15em]`}
          style={{ color: "#1C78AE" }} /* brand-600 */
        >
          Analytics
        </p>
      </div>
    </Link>
  );
}
