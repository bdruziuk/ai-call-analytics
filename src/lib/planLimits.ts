import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";

/* ── Calendar-month helpers ──────────────────────────────────────────────── */

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/* ── Get or lazily create subscription ──────────────────────────────────── */

export async function getOrCreateSubscription(userId: string) {
  let sub = await db.subscription.findUnique({ where: { userId } });

  if (!sub) {
    const now = new Date();
    sub = await db.subscription.create({
      data: {
        userId,
        planId: "free",
        status: "active",
        currentPeriodStart: startOfMonth(now),
        currentPeriodEnd:   endOfMonth(now),
        minutesUsed: 0,
      },
    });
  }

  // For free-plan users without a Stripe subscription, roll the period over
  // automatically at the start of each calendar month.
  if (!sub.stripeSubscriptionId && new Date() > sub.currentPeriodEnd) {
    const now = new Date();
    sub = await db.subscription.update({
      where: { userId },
      data: {
        minutesUsed:        0,
        currentPeriodStart: startOfMonth(now),
        currentPeriodEnd:   endOfMonth(now),
      },
    });
  }

  return sub;
}

/* ── Check whether this user can upload another call ────────────────────── */

export type CheckResult = {
  allowed: boolean;
  reason?: "limit_exceeded";
  planId: string;
  minutesUsed: number;
  minutesLimit: number;   // plan's limit; -1 = no limit (test accounts)
};

export async function checkUploadAllowed(userId: string): Promise<CheckResult> {
  // Test accounts bypass all limits
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { isTestAccount: true },
  });

  if (user?.isTestAccount) {
    return { allowed: true, planId: "pro", minutesUsed: 0, minutesLimit: -1 };
  }

  const sub  = await getOrCreateSubscription(userId);
  const plan = getPlan(sub.planId);

  // minutesPerMonth === -1 means unlimited — skip the limit check
  if (plan.minutesPerMonth !== -1 && sub.minutesUsed >= plan.minutesPerMonth) {
    return {
      allowed:      false,
      reason:       "limit_exceeded",
      planId:       sub.planId,
      minutesUsed:  sub.minutesUsed,
      minutesLimit: plan.minutesPerMonth,
    };
  }

  return {
    allowed:      true,
    planId:       sub.planId,
    minutesUsed:  sub.minutesUsed,
    minutesLimit: plan.minutesPerMonth,
  };
}

/* ── Increment minutesUsed after a call is processed ────────────────────── */

export async function incrementMinutesUsed(
  userId: string,
  durationSeconds: number,
): Promise<void> {
  if (durationSeconds <= 0) return;
  const minutes = Math.ceil(durationSeconds / 60);
  await db.subscription.updateMany({
    where: { userId },
    data:  { minutesUsed: { increment: minutes } },
  });
}
