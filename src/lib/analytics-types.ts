/* ─────────────────────────────────────────────────────────────────────────────
   Analytics Types
   Used by the role-based Owner / Marketer dashboards.
   Mock data lives in src/lib/mock-dashboard-analytics.ts.
   Replace with real Prisma/API data by swapping the data source passed
   to <OwnerDashboard> and <MarketerDashboard>.
   ───────────────────────────────────────────────────────────────────────────── */

export type DashboardRole = "owner" | "marketer";

/* ── Owner KPIs ─────────────────────────────────────────────────────────── */

export type OwnerKpi = {
  /** Estimated revenue lost due to operator mistakes (₴) */
  lostRevenue: number;
  /** % change vs. previous period — positive = MORE losses (bad) */
  lostRevenueTrend: number;

  conversionRate: number;
  /** positive = better */
  conversionTrend: number;

  upsellRate: number;
  upsellTrend: number;

  criticalCallsCount: number;
  /** positive = more critical calls (bad) */
  criticalCallsTrend: number;
};

export type LostRevenueByDay = {
  date: string;   // e.g. "01.06"
  amount: number; // ₴
};

export type OperatorKpi = {
  id: string;
  name: string;
  conversionRate: number;        // 0-100 %
  aht: number;                   // Average Handle Time, seconds
  upsellRate: number;            // 0-100 %
  closedChecksPerHour: number;
  wasteTimeRatio: number;        // 0-100 % — time on junk/dead leads
  politenessScore: number;       // 0-10
  status: "good" | "attention" | "critical";
};

export type CriticalCall = {
  id: string;
  datetime: string;   // "14.06 14:22"
  operator: string;
  reason: string;
  estimatedLoss: number; // ₴
  /** id of the Call record in DB — link to /calls/:id when available */
  callId?: string;
};

export type TopProduct = {
  product: string;
  callCount: number;
  soldCount: number;
  conversionRate: number; // 0-100 %
};

export type OwnerAnalytics = {
  kpi: OwnerKpi;
  lostRevenueByDay: LostRevenueByDay[];
  operators: OperatorKpi[];
  criticalCalls: CriticalCall[];
  topProducts: TopProduct[];
};

/* ── Marketer KPIs ──────────────────────────────────────────────────────── */

export type MarketerKpi = {
  adCalls: number;
  adCallsTrend: number;
  junkLeadRate: number;
  junkLeadTrend: number; // negative = fewer junk leads (good)
  adConversionRate: number;
  adConversionTrend: number;
  topRefusalReason: string;
};

export type TrafficSource = {
  id: string;
  source: string;
  campaign: string;
  calls: number;
  orders: number;
  conversionRate: number;  // %
  junkLeadRate: number;    // %
  estimatedRevenue: number; // ₴
  recommendation: "scale" | "check" | "disable" | "improve_landing";
};

export type RefusalReason = {
  reason: string;
  count: number;
  percentage: number;
};

export type JunkLead = {
  id: string;
  date: string;
  phone: string;
  source: string;
  campaign: string;
  reason: "wrong_intent" | "did_not_apply" | "accidental" | "non_target";
};

export type DemandTag = {
  tag: string;
  count: number;
  /** 1–5 controls display size */
  weight: number;
};

export type PromotionInsight = {
  name: string;
  customerMentionRate: number; // %
  operatorMentionRate: number; // %
};

export type MarketerAnalytics = {
  kpi: MarketerKpi;
  trafficSources: TrafficSource[];
  junkLeads: JunkLead[];
  refusalReasons: RefusalReason[];
  demandTags: DemandTag[];
  promotionInsights: PromotionInsight[];
};
