export type PlanId = "free" | "starter" | "growth" | "pro";

export type Plan = {
  id: PlanId;
  minutesPerMonth: number;
  maxManagers: number | null;         // null = unlimited
  hasApi: boolean;
  hasWebhooks: boolean;
  hasDetailedReport: boolean;
  hasAiCoaching: boolean;
  hasCrmIntegration: boolean;
  hasTelephonyIntegration: boolean;
  hasWhiteLabel: boolean;
  storageDays: number;                // -1 = unlimited
  priceUah: number;                   // 0 for free
  priceUsd: number;                   // 0 for free (whole dollars)
  stripePriceId: string | null;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    minutesPerMonth: 30,
    maxManagers: 1,
    hasApi: false,
    hasWebhooks: false,
    hasDetailedReport: false,
    hasAiCoaching: false,
    hasCrmIntegration: false,
    hasTelephonyIntegration: false,
    hasWhiteLabel: false,
    storageDays: 7,
    priceUah: 0,
    priceUsd: 0,
    stripePriceId: null,
  },
  starter: {
    id: "starter",
    minutesPerMonth: 300,
    maxManagers: 3,
    hasApi: false,
    hasWebhooks: false,
    hasDetailedReport: false,
    hasAiCoaching: false,
    hasCrmIntegration: false,
    hasTelephonyIntegration: false,
    hasWhiteLabel: false,
    storageDays: 365,
    priceUah: 990,
    priceUsd: 24,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
  },
  growth: {
    id: "growth",
    minutesPerMonth: 2000,
    maxManagers: 10,
    hasApi: true,
    hasWebhooks: true,
    hasDetailedReport: true,
    hasAiCoaching: true,
    hasCrmIntegration: false,
    hasTelephonyIntegration: true,
    hasWhiteLabel: false,
    storageDays: 365,
    priceUah: 2990,
    priceUsd: 79,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? null,
  },
  pro: {
    id: "pro",
    minutesPerMonth: -1,   // -1 = unlimited
    maxManagers: null,     // unlimited
    hasApi: true,
    hasWebhooks: true,
    hasDetailedReport: true,
    hasAiCoaching: true,
    hasCrmIntegration: true,
    hasTelephonyIntegration: true,
    hasWhiteLabel: true,
    storageDays: 365,
    priceUah: 7900,
    priceUsd: 199,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "growth", "pro"];

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.free;
}

/** Price lookup by Stripe price ID — used in webhook handler */
export function getPlanByStripePriceId(priceId: string): Plan | null {
  return (
    Object.values(PLANS).find((p) => p.stripePriceId === priceId) ?? null
  );
}
