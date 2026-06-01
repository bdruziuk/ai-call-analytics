import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { stripe, appUrl } from "@/lib/stripe";
import { db } from "@/lib/db";

/**
 * POST /api/payments/portal
 * Body: { lang?: string }
 *
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * Returns { url }.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let lang = "en";
  try {
    const body = await request.json();
    lang = String(body.lang ?? "en");
  } catch { /* ignore */ }

  const sub = await db.subscription.findUnique({
    where:  { userId: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No active Stripe subscription found" },
      { status: 404 },
    );
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   sub.stripeCustomerId,
    return_url: `${appUrl()}/${lang}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
