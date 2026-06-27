import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/auth";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { db } from "@/lib/db";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";

type Props = {
  params:       Promise<{ lang: string }>;
  searchParams: Promise<{ from?: string; to?: string; viewAs?: string }>;
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function toArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function topN(
  arr: string[],
  n = 5,
): { label: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const s of arr) {
    const key = s.trim();
    if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function AnalyticsPage({ params, searchParams }: Props) {
  const { lang }             = await params;
  const { from, to, viewAs } = await searchParams;
  if (!hasLocale(lang)) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/${lang}/auth/signin`);

  const { resolveUserId } = await import("@/lib/adminViewAs");
  const userId = await resolveUserId(session.user.id, session.user.email, viewAs);

  // Build optional date range filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from);
  if (to)   dateFilter.lte = new Date(to + "T23:59:59.999Z");
  const hasDateFilter = !!(from || to);

  const [t, calls, profiles] = await Promise.all([
    getDictionary(lang),
    db.call.findMany({
      where:   {
        userId,
        status: "completed",
        ...(hasDateFilter && { createdAt: dateFilter }),
      },
      select:  {
        id: true, score: true, saleStatus: true, product: true,
        issues: true, positives: true, recommendations: true,
        objections: true, managerMistakes: true,
        durationSeconds: true, salesProfileId: true, createdAt: true,
        language: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.salesProfile.findMany({
      where:   { userId },
      select:  { id: true, name: true },
    }),
  ]);

  /* ── Aggregate ── */

  type CallRow    = typeof calls[number];
  type ProfileRow = typeof profiles[number];

  const profileMap = new Map<string, string>(profiles.map((p: ProfileRow) => [p.id, String(p.name)]));
  const total      = calls.length;

  if (total === 0) {
    return (
      <AnalyticsClient
        t={t}
        lang={lang}
        data={null}
        periodFrom={from}
        periodTo={to}
        viewAs={viewAs}
      />
    );
  }

  // Sale distribution
  let sold = 0, notSold = 0, potential = 0;
  for (const c of calls) {
    if (c.saleStatus === "sold")                sold++;
    else if (c.saleStatus === "not_sold")       notSold++;
    else if (c.saleStatus === "potential_sale") potential++;
  }

  // Average score
  const scored   = calls.filter((c: CallRow) => c.score !== null);
  const avgScore = scored.length
    ? Math.round((scored.reduce((s: number, c: CallRow) => s + c.score!, 0) / scored.length) * 10) / 10
    : null;

  // Score trend (monthly)
  const monthMap = new Map<string, { total: number; count: number }>();
  for (const c of calls) {
    if (c.score === null) continue;
    const mo = c.createdAt.toISOString().slice(0, 7);
    const e  = monthMap.get(mo) ?? { total: 0, count: 0 };
    monthMap.set(mo, { total: e.total + c.score, count: e.count + 1 });
  }
  const scoreTrend = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { total, count }]) => ({
      month,
      avgScore: Math.round((total / count) * 10) / 10,
      count,
    }));

  // Aggregate text arrays
  const allIssues:    string[] = [];
  const allMistakes:  string[] = [];
  const allObjections: string[] = [];
  const allProducts:   string[] = [];
  for (const c of calls) {
    allIssues.push(...toArr(c.issues));
    allMistakes.push(...toArr(c.managerMistakes));
    allObjections.push(...toArr(c.objections));
    if (c.product) allProducts.push(c.product.trim());
  }
  const topIssues     = topN(allIssues);
  const topMistakes   = topN(allMistakes);
  const topObjections = topN(allObjections);
  const topProducts   = topN(allProducts);

  // Per-manager stats
  const managerMap = new Map<string, {
    name: string; scores: number[];
    sold: number; total: number;
    issues: string[]; mistakes: string[];
  }>();
  for (const c of calls) {
    const pid  = c.salesProfileId ?? "__unassigned__";
    const name = c.salesProfileId ? (profileMap.get(c.salesProfileId) ?? "Unknown") : "Unassigned";
    const m    = managerMap.get(pid) ?? { name, scores: [] as number[], sold: 0, total: 0, issues: [] as string[], mistakes: [] as string[] };
    m.total++;
    if (c.score !== null) m.scores.push(c.score);
    if (c.saleStatus === "sold") m.sold++;
    m.issues.push(...toArr(c.issues));
    m.mistakes.push(...toArr(c.managerMistakes));
    managerMap.set(pid, m);
  }
  const managers = [...managerMap.entries()]
    .filter(([id]) => id !== "__unassigned__")
    .map(([, m]) => ({
      name:           m.name,
      totalCalls:     m.total,
      avgScore:       m.scores.length ? Math.round((m.scores.reduce((a, b) => a + b, 0) / m.scores.length) * 10) / 10 : null,
      conversionRate: m.total > 0 ? Math.round((m.sold / m.total) * 100) : null,
      topIssues:      topN(m.issues, 3).map((x) => x.label),
      topMistakes:    topN(m.mistakes, 3).map((x) => x.label),
    }))
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

  const dateFrom = calls[0].createdAt.toISOString().slice(0, 10);
  const dateTo   = calls[calls.length - 1].createdAt.toISOString().slice(0, 10);

  const analyticsData = {
    dateFrom,
    dateTo,
    totalCalls: total,
    avgScore,
    sold,
    notSold,
    potential,
    topIssues:     topIssues.map((x) => ({ issue: x.label, count: x.count })),
    topMistakes:   topMistakes.map((x) => ({ mistake: x.label, count: x.count })),
    topObjections: topObjections.map((x) => ({ objection: x.label, count: x.count })),
    topProducts:   topProducts.map((x) => ({ product: x.label, count: x.count })),
    managers,
    scoreTrend,
  };

  return (
    <AnalyticsClient
      t={t}
      lang={lang}
      data={analyticsData}
      periodFrom={from}
      periodTo={to}
    />
  );
}
