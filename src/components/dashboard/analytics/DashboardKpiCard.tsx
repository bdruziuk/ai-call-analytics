import { type ReactNode } from "react";

type Trend = {
  value: number;
  /** true = a positive number is bad (e.g. lost revenue, critical calls) */
  invertPolarity?: boolean;
  suffix?: string;
};

type Props = {
  icon: ReactNode;
  label: string;
  value: string;
  description?: string;
  trend?: Trend;
  trendVs?: string;
  accentColor?: "red" | "green" | "amber" | "brand";
  smallValue?: boolean;
};

function trendColor(value: number, invert = false) {
  const isGood = invert ? value < 0 : value > 0;
  if (value === 0) return "text-slate-400";
  return isGood ? "text-emerald-600" : "text-red-500";
}

function trendArrow(value: number, invert = false) {
  const isGood = invert ? value < 0 : value > 0;
  if (value === 0) return "→";
  return isGood ? "↑" : "↓";
}

const ACCENT: Record<string, { icon: string; border: string }> = {
  red:   { icon: "bg-red-100 text-red-600",     border: "border-red-100"   },
  green: { icon: "bg-emerald-100 text-emerald-600", border: "border-emerald-100" },
  amber: { icon: "bg-amber-100 text-amber-600", border: "border-amber-100" },
  brand: { icon: "bg-brand-100 text-brand-600", border: "border-brand-100" },
};

export function DashboardKpiCard({ icon, label, value, description, trend, trendVs = "vs. last week", accentColor = "brand", smallValue = false }: Props) {
  const ac = ACCENT[accentColor] ?? ACCENT.brand;

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${ac.border}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${ac.icon}`}>
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      </div>

      <p className={`font-extrabold text-slate-900 ${smallValue ? "text-sm leading-snug" : "text-3xl"}`}>{value}</p>

      {description && (
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      )}

      {trend !== undefined && (
        <p className={`mt-2 text-xs font-semibold ${trendColor(trend.value, trend.invertPolarity)}`}>
          {trendArrow(trend.value, trend.invertPolarity)}{" "}
          {Math.abs(trend.value)}{trend.suffix ?? "%"} {trendVs}
        </p>
      )}
    </div>
  );
}
