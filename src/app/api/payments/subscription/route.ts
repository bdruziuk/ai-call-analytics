import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getOrCreateSubscription } from "@/lib/planLimits";
import { getPlan } from "@/lib/plans";

/**
 * GET /api/payments/subscription
 * Returns the current user's subscription info including plan details and usage.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub  = await getOrCreateSubscription(session.user.id);
  const plan = getPlan(sub.planId);

  return NextResponse.json({
    planId:              sub.planId,
    status:              sub.status,
    minutesUsed:         sub.minutesUsed,
    minutesLimit:        plan.minutesPerMonth,
    currentPeriodEnd:    sub.currentPeriodEnd.toISOString(),
    hasStripeSubscription: !!sub.stripeSubscriptionId,
  });
}
