/* ─────────────────────────────────────────────────────────────────────────────
   Mock Analytics Data
   ─────────────────────────────────────────────────────────────────────────────
   HOW TO REPLACE WITH REAL DATA
   ──────────────────────────────
   1. Create a server function (e.g. src/lib/fetchOwnerAnalytics.ts) that
      queries Prisma and aggregates Call records into OwnerAnalytics.
   2. Derive metrics from existing Call fields:
        lostRevenue      ← calls where saleStatus = "not_sold" AND score < 5
        conversionRate   ← completed calls with saleStatus = "sold" / total answered
        upsellRate       ← calls where managerMistakes includes no upsell marker
        criticalCalls    ← calls where score ≤ 3 or issues contains conflict/rude
        operatorKpi      ← group by salesProfileId, aggregate score/duration/etc.
   3. Pass the real data to <OwnerDashboard data={realData} /> instead of
      importing MOCK_OWNER.
   4. Delete or comment out this file.
   ───────────────────────────────────────────────────────────────────────────── */

import type { OwnerAnalytics, MarketerAnalytics } from "./analytics-types";

export const MOCK_OWNER: OwnerAnalytics = {
  kpi: {
    lostRevenue: 12450,
    lostRevenueTrend: 8.3,     // +8.3% — more losses vs prev period (bad)
    conversionRate: 64,
    conversionTrend: 2.1,      // +2.1% better
    upsellRate: 40,
    upsellTrend: -3.5,         // −3.5% worse
    criticalCallsCount: 7,
    criticalCallsTrend: 2,     // +2 more critical calls (bad)
  },

  lostRevenueByDay: [
    { date: "01.06", amount: 420  },
    { date: "02.06", amount: 680  },
    { date: "03.06", amount: 310  },
    { date: "04.06", amount: 920  },
    { date: "05.06", amount: 540  },
    { date: "06.06", amount: 1100 },
    { date: "07.06", amount: 380  },
    { date: "08.06", amount: 760  },
    { date: "09.06", amount: 450  },
    { date: "10.06", amount: 830  },
    { date: "11.06", amount: 620  },
    { date: "12.06", amount: 940  },
    { date: "13.06", amount: 280  },
    { date: "14.06", amount: 1220 },
  ],

  operators: [
    {
      id: "op1",
      name: "Марія К.",
      conversionRate: 78,
      aht: 168,
      upsellRate: 67,
      closedChecksPerHour: 14,
      wasteTimeRatio: 8,
      politenessScore: 9.2,
      status: "good",
    },
    {
      id: "op2",
      name: "Дмитро В.",
      conversionRate: 71,
      aht: 195,
      upsellRate: 52,
      closedChecksPerHour: 11,
      wasteTimeRatio: 14,
      politenessScore: 8.7,
      status: "good",
    },
    {
      id: "op3",
      name: "Олена М.",
      conversionRate: 48,
      aht: 242,
      upsellRate: 29,
      closedChecksPerHour: 7,
      wasteTimeRatio: 31,
      politenessScore: 7.1,
      status: "attention",
    },
    {
      id: "op4",
      name: "Андрій Р.",
      conversionRate: 35,
      aht: 298,
      upsellRate: 11,
      closedChecksPerHour: 5,
      wasteTimeRatio: 48,
      politenessScore: 5.4,
      status: "critical",
    },
  ],

  criticalCalls: [
    { id: "c1", datetime: "14.06 14:22", operator: "Андрій Р.", reason: "Грубість / конфлікт",          estimatedLoss: 340 },
    { id: "c2", datetime: "14.06 12:05", operator: "Олена М.",  reason: "Не запропоновано альтернативу", estimatedLoss: 210 },
    { id: "c3", datetime: "14.06 10:48", operator: "Андрій Р.", reason: "Клієнт поклав слухавку",        estimatedLoss: 180 },
    { id: "c4", datetime: "13.06 19:33", operator: "Олена М.",  reason: "Не запропоновано апсейл",       estimatedLoss: 95  },
    { id: "c5", datetime: "13.06 18:11", operator: "Дмитро В.", reason: "Довге очікування",              estimatedLoss: 120 },
  ],
};

export const MOCK_MARKETER: MarketerAnalytics = {
  kpi: {
    adCalls: 248,
    adCallsTrend: 12,
    junkLeadRate: 18,
    junkLeadTrend: -2,        // −2% fewer junk leads (good)
    adConversionRate: 31,
    adConversionTrend: 4,
    topRefusalReason: "Дорога доставка",
  },

  trafficSources: [
    { id: "s1", source: "Google Ads",       campaign: "Доставка піца — Київ",  calls: 98, orders: 41, conversionRate: 42, junkLeadRate: 8,  estimatedRevenue: 28700, recommendation: "scale"          },
    { id: "s2", source: "Facebook Ads",     campaign: "Суші 1+1=3",            calls: 74, orders: 18, conversionRate: 24, junkLeadRate: 31, estimatedRevenue: 12600, recommendation: "check"          },
    { id: "s3", source: "Instagram Target", campaign: "Літнє меню",            calls: 42, orders: 6,  conversionRate: 14, junkLeadRate: 44, estimatedRevenue: 4200,  recommendation: "disable"        },
    { id: "s4", source: "QR-код",           campaign: "Столовий маркетинг",    calls: 21, orders: 9,  conversionRate: 43, junkLeadRate: 5,  estimatedRevenue: 6300,  recommendation: "scale"          },
    { id: "s5", source: "Сайт (кнопка)",   campaign: "Органічний трафік",     calls: 13, orders: 3,  conversionRate: 23, junkLeadRate: 15, estimatedRevenue: 2100,  recommendation: "improve_landing" },
  ],

  junkLeads: [
    { id: "j1", date: "14.06 15:11", phone: "+380 *** ***-**-41", source: "Instagram Target", campaign: "Літнє меню",  reason: "accidental"    },
    { id: "j2", date: "14.06 13:44", phone: "+380 *** ***-**-07", source: "Facebook Ads",     campaign: "Суші 1+1=3", reason: "non_target"    },
    { id: "j3", date: "14.06 11:22", phone: "+380 *** ***-**-88", source: "Instagram Target", campaign: "Літнє меню",  reason: "did_not_apply" },
    { id: "j4", date: "13.06 20:05", phone: "+380 *** ***-**-63", source: "Facebook Ads",     campaign: "Суші 1+1=3", reason: "wrong_intent"  },
  ],

  refusalReasons: [
    { reason: "Дорога доставка",              count: 34, percentage: 31 },
    { reason: "Немає в наявності",             count: 21, percentage: 19 },
    { reason: "Довго чекати",                 count: 18, percentage: 16 },
    { reason: "Немає безготівкового розрахунку", count: 14, percentage: 13 },
    { reason: "Не підійшла ціна",              count: 12, percentage: 11 },
    { reason: "Не запропонували альтернативу", count: 11, percentage: 10 },
  ],

  demandTags: [
    { tag: "доставка за 30 хв",    count: 87, weight: 5 },
    { tag: "безготівкова оплата",  count: 64, weight: 4 },
    { tag: "постне меню",          count: 58, weight: 4 },
    { tag: "соуси",                count: 51, weight: 3 },
    { tag: "піца 1+1",             count: 44, weight: 3 },
    { tag: "веганське меню",       count: 38, weight: 3 },
    { tag: "великий розмір",       count: 31, weight: 2 },
    { tag: "дитяче меню",          count: 27, weight: 2 },
    { tag: "знижка студент",       count: 22, weight: 2 },
    { tag: "набір на компанію",    count: 19, weight: 1 },
    { tag: "без глютену",          count: 16, weight: 1 },
    { tag: "подарункова упаковка", count: 12, weight: 1 },
  ],

  promotionInsights: [
    { name: 'Акція "1+1=3"',                       customerMentionRate: 70, operatorMentionRate: 42 },
    { name: "Літнє меню",                           customerMentionRate: 45, operatorMentionRate: 61 },
    { name: "Безкоштовна доставка від 400 грн",    customerMentionRate: 38, operatorMentionRate: 28 },
  ],
};
