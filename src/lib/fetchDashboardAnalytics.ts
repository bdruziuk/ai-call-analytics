import { db } from "@/lib/db";
import type { OwnerAnalytics, MarketerAnalytics, OperatorKpi, CriticalCall, TopProduct } from "./analytics-types";

function toArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

function trend(curr: number, prev: number) {
  if (prev === 0) return 0;
  return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
}

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function fetchOwnerAnalytics(userId: string, since: Date | null = null): Promise<OwnerAnalytics> {
  const now = new Date();
  const periodStart = since ?? new Date(now.getTime() - 30 * 86400_000);
  const periodMs    = since ? (now.getTime() - since.getTime()) : 30 * 86400_000;
  const prevStart   = new Date(periodStart.getTime() - periodMs);

  const [currentCalls, prevCalls, profiles] = await Promise.all([
    db.call.findMany({
      where: { userId, status: "completed", createdAt: { gte: periodStart } },
      select: {
        id: true, score: true, saleStatus: true, issues: true,
        managerMistakes: true, objections: true, durationSeconds: true,
        salesProfileId: true, createdAt: true, fileName: true, product: true,
      },
    }),
    db.call.findMany({
      where: { userId, status: "completed", createdAt: { gte: prevStart, lt: periodStart } },
      select: { score: true, saleStatus: true },
    }),
    db.salesProfile.findMany({
      where: { userId },
      select: { id: true, name: true },
    }),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

  // ── Current period KPIs (junk excluded from all business metrics) ───────
  const realCalls = currentCalls.filter((c) => c.saleStatus !== "junk");
  const total     = realCalls.length;
  const sold      = realCalls.filter((c) => c.saleStatus === "sold").length;
  const critical  = realCalls.filter((c) => (c.score ?? 10) <= 3);
  const notSold   = realCalls.filter((c) => c.saleStatus === "not_sold" && (c.score ?? 10) < 5).length;
  const upsellCalls = realCalls.filter((c) => {
    const mistakes = toArr(c.managerMistakes);
    return mistakes.some((m) => /upsell|допродаж|cross/i.test(m));
  }).length;

  // ── Previous period KPIs ────────────────────────────────────────────────
  const prevRealCalls = prevCalls.filter((c) => c.saleStatus !== "junk");
  const prevTotal     = prevRealCalls.length;
  const prevSold      = prevRealCalls.filter((c) => c.saleStatus === "sold").length;
  const prevCritical  = prevRealCalls.filter((c) => (c.score ?? 10) <= 3).length;
  const prevNotSold   = prevRealCalls.filter((c) => c.saleStatus === "not_sold" && (c.score ?? 10) < 5).length;

  const convRate     = pct(sold, total);
  const prevConvRate = pct(prevSold, prevTotal);
  const upsellRate   = total > 0 ? pct(upsellCalls, total) : 0;

  // ── Lost revenue by day (last 14 days) ─────────────────────────────────
  const last14 = new Date(now.getTime() - 14 * 86400_000);
  const byDay = new Map<string, number>();
  for (const c of currentCalls) {
    if (c.createdAt < last14) continue;
    if (c.saleStatus !== "not_sold") continue;
    const key = fmtDate(c.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const lostRevenueByDay = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, amount: count }));

  // ── Operator KPIs ───────────────────────────────────────────────────────
  const opMap = new Map<string, { scores: number[]; sold: number; total: number; durations: number[]; upsells: number }>();
  for (const c of realCalls) {
    const opId = c.salesProfileId ?? "__none__";
    if (!opMap.has(opId)) opMap.set(opId, { scores: [], sold: 0, total: 0, durations: [], upsells: 0 });
    const op = opMap.get(opId)!;
    op.total++;
    if (c.score != null) op.scores.push(c.score);
    if (c.saleStatus === "sold") op.sold++;
    if (c.durationSeconds) op.durations.push(c.durationSeconds);
    const mistakes = toArr(c.managerMistakes);
    if (mistakes.some((m) => /upsell|допродаж|cross/i.test(m))) op.upsells++;
  }

  const operators: OperatorKpi[] = [...opMap.entries()].map(([opId, op]) => {
    const avgScore = op.scores.length ? op.scores.reduce((a, b) => a + b, 0) / op.scores.length : 0;
    const convRate = pct(op.sold, op.total);
    const aht = op.durations.length ? Math.round(op.durations.reduce((a, b) => a + b, 0) / op.durations.length) : 0;
    const upsellRate = pct(op.upsells, op.total);
    const status: OperatorKpi["status"] = convRate >= 60 ? "good" : convRate >= 40 ? "attention" : "critical";
    return {
      id: opId,
      name: profileMap.get(opId) ?? "Без профілю",
      conversionRate: convRate,
      aht,
      upsellRate,
      closedChecksPerHour: aht > 0 ? Math.round(3600 / aht) : 0,
      wasteTimeRatio: 100 - convRate,
      politenessScore: Math.round(avgScore * 10) / 10,
      status,
    };
  }).sort((a, b) => b.conversionRate - a.conversionRate);

  // ── Top products (mentioned in calls) ───────────────────────────────────
  const productMap = new Map<string, { total: number; sold: number }>();
  for (const c of realCalls) {
    const product = c.product?.trim();
    if (!product) continue;
    if (!productMap.has(product)) productMap.set(product, { total: 0, sold: 0 });
    const p = productMap.get(product)!;
    p.total++;
    if (c.saleStatus === "sold") p.sold++;
  }
  const topProducts: TopProduct[] = [...productMap.entries()]
    .map(([product, { total, sold }]) => ({
      product,
      callCount: total,
      soldCount: sold,
      conversionRate: pct(sold, total),
    }))
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 8);

  // ── Critical calls ──────────────────────────────────────────────────────
  const criticalCalls: CriticalCall[] = critical.slice(0, 10).map((c) => {
    const issues = toArr(c.issues);
    const d = c.createdAt;
    return {
      id: c.id,
      callId: c.id,
      datetime: `${fmtDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      operator: profileMap.get(c.salesProfileId ?? "") ?? "Невідомо",
      reason: issues[0] ?? "Низький скор",
      estimatedLoss: 0,
    };
  });

  return {
    kpi: {
      lostRevenue: notSold,
      lostRevenueTrend: trend(notSold, prevNotSold),
      conversionRate: convRate,
      conversionTrend: trend(convRate, prevConvRate),
      upsellRate,
      upsellTrend: 0,
      criticalCallsCount: critical.length,
      criticalCallsTrend: critical.length - prevCritical,
    },
    lostRevenueByDay,
    operators,
    criticalCalls,
    topProducts,
  };
}

export async function fetchMarketerAnalytics(userId: string, since: Date | null = null): Promise<MarketerAnalytics> {
  const now         = Date.now();
  const periodStart = since ?? new Date(now - 30 * 86400_000);
  const periodMs    = since ? (now - since.getTime()) : 30 * 86400_000;
  const prevStart   = new Date(periodStart.getTime() - periodMs);

  const [currentCalls, prevCalls] = await Promise.all([
    db.call.findMany({
      where: { userId, status: "completed", createdAt: { gte: periodStart } },
      select: { id: true, saleStatus: true, score: true, objections: true, customerIntent: true, createdAt: true, source: true },
    }),
    db.call.findMany({
      where: { userId, status: "completed", createdAt: { gte: prevStart, lt: periodStart } },
      select: { saleStatus: true },
    }),
  ]);

  const total     = currentCalls.length;
  const prevTotal = prevCalls.length;
  const sold      = currentCalls.filter((c) => c.saleStatus === "sold").length;
  const prevSold  = prevCalls.filter((c) => c.saleStatus === "sold").length;
  const junk      = currentCalls.filter((c) => !c.saleStatus || c.saleStatus === "unknown").length;
  const prevJunk  = prevCalls.filter((c) => !c.saleStatus || c.saleStatus === "unknown").length;

  const convRate     = pct(sold, total);
  const prevConvRate = pct(prevSold, prevTotal);
  const junkRate     = pct(junk, total);
  const prevJunkRate = pct(prevJunk, prevTotal);

  // ── Refusal reasons from objections ────────────────────────────────────
  const objectionFreq = new Map<string, number>();
  for (const c of currentCalls) {
    for (const o of toArr(c.objections)) {
      const key = o.trim();
      if (key) objectionFreq.set(key, (objectionFreq.get(key) ?? 0) + 1);
    }
  }
  const totalObjections = [...objectionFreq.values()].reduce((a, b) => a + b, 0);
  const refusalReasons = [...objectionFreq.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([reason, count]) => ({ reason, count, percentage: pct(count, totalObjections) }));

  const topRefusalReason = refusalReasons[0]?.reason ?? "—";

  // ── Demand tags from customerIntent ────────────────────────────────────
  const intentFreq = new Map<string, number>();
  for (const c of currentCalls) {
    if (c.customerIntent) {
      const key = c.customerIntent.trim();
      if (key) intentFreq.set(key, (intentFreq.get(key) ?? 0) + 1);
    }
  }
  const maxIntentCount = Math.max(...intentFreq.values(), 1);
  const demandTags = [...intentFreq.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count, weight: Math.ceil((count / maxIntentCount) * 5) as 1 | 2 | 3 | 4 | 5 }));

  // ── Traffic sources grouped by call source ──────────────────────────────
  const sourceMap = new Map<string, { calls: number; sold: number; junk: number }>();
  for (const c of currentCalls) {
    const s = c.source ?? "manual";
    if (!sourceMap.has(s)) sourceMap.set(s, { calls: 0, sold: 0, junk: 0 });
    const src = sourceMap.get(s)!;
    src.calls++;
    if (c.saleStatus === "sold") src.sold++;
    if (!c.saleStatus || c.saleStatus === "unknown") src.junk++;
  }
  const trafficSources = [...sourceMap.entries()].map(([source, data]) => ({
    id: source,
    source,
    campaign: "—",
    calls: data.calls,
    orders: data.sold,
    conversionRate: pct(data.sold, data.calls),
    junkLeadRate: pct(data.junk, data.calls),
    estimatedRevenue: data.sold,
    recommendation: (pct(data.sold, data.calls) >= 50 ? "scale" : pct(data.junk, data.calls) >= 30 ? "check" : "improve_landing") as "scale" | "check" | "disable" | "improve_landing",
  }));

  // ── Junk leads ──────────────────────────────────────────────────────────
  const junkLeads = currentCalls
    .filter((c) => !c.saleStatus || c.saleStatus === "unknown")
    .slice(0, 20)
    .map((c) => ({
      id: c.id,
      date: fmtDate(c.createdAt),
      phone: "—",
      source: c.source ?? "manual",
      campaign: "—",
      reason: "wrong_intent" as const,
    }));

  return {
    kpi: {
      adCalls: total,
      adCallsTrend: trend(total, prevTotal),
      junkLeadRate: junkRate,
      junkLeadTrend: trend(junkRate, prevJunkRate),
      adConversionRate: convRate,
      adConversionTrend: trend(convRate, prevConvRate),
      topRefusalReason,
    },
    trafficSources,
    junkLeads,
    refusalReasons,
    demandTags,
    promotionInsights: [],
  };
}
