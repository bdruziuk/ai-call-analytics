import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { stripe, appUrl } from "@/lib/stripe";
import { db } from "@/lib/db";
import { getPlan, PLAN_ORDER } from "@/lib/plans";

/**
 * POST /api/payments/checkout
 * Body: { planId: "starter" | "growth" | "pro", lang?: string }
 *
 * Creates a Stripe Checkout session and returns { url }.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let planId: string;
  let lang = "en";
  try {
    const body = await request.json();
    planId = String(body.planId ?? "");
    lang   = String(body.lang ?? "en");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!PLAN_ORDER.includes(planId as never) || planId === "free") {
    return NextResponse.json(
      { error: "planId must be one of: starter, growth, pro" },
      { status: 400 },
    );
  }

  const plan = getPlan(planId);
  if (!plan.stripePriceId) {
    return NextResponse.json(
      { error: "This plan is not yet available for purchase. Please configure STRIPE_PRICE_* env vars." },
      { status: 503 },
    );
  }

  // Look up or create Stripe customer
  const sub = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });

  let stripeCustomerId = sub?.stripeCustomerId ?? undefined;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    stripeCustomerId = customer.id;

    // Persist customer ID even before checkout completes
    await db.subscription.upsert({
      where:  { userId: session.user.id },
      update: { stripeCustomerId },
      create: {
        userId:            session.user.id,
        planId:            "free",
        status:            "active",
        stripeCustomerId,
        currentPeriodStart: new Date(),
        currentPeriodEnd:   new Date(),
      },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode:                 "subscription",
    customer:             stripeCustomerId,
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl()}/${lang}/settings?payment=success`,
    cancel_url:  `${appUrl()}/${lang}/settings?payment=cancelled`,
    metadata:    { userId: session.user.id, planId },
    subscription_data: {
      metadata: { userId: session.user.id, planId },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
