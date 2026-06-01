import { NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { db } from "@/lib/db";
import { getPlanByStripePriceId } from "@/lib/plans";
import type Stripe from "stripe";

/**
 * POST /api/payments/webhook
 *
 * Stripe sends signed events here.  We handle:
 *   - customer.subscription.created / updated  → sync planId, period, status
 *   - customer.subscription.deleted            → downgrade to free
 *   - invoice.paid                             → reset minutesUsed for new period
 *   - invoice.payment_failed                   → mark subscription past_due
 */

// Next.js App Router: disable body parsing so we can pass the raw buffer to
// stripe.webhooks.constructEvent for signature verification.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig     = request.headers.get("stripe-signature") ?? "";

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      /* ── Subscription created or updated ─────────────────────────────── */
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub   = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id;
        const plan  = priceId ? getPlanByStripePriceId(priceId) : null;
        const planId = plan?.id ?? "free";

        const userId = sub.metadata?.userId;
        if (!userId) {
          console.warn("[webhook] subscription has no userId metadata:", sub.id);
          break;
        }

        await db.subscription.upsert({
          where:  { userId },
          update: {
            planId,
            status:              mapStripeStatus(sub.status),
            stripeSubscriptionId: sub.id,
            stripePriceId:       priceId ?? null,
            currentPeriodStart:  new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000),
            currentPeriodEnd:    new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
          },
          create: {
            userId,
            planId,
            status:              mapStripeStatus(sub.status),
            stripeCustomerId:    typeof sub.customer === "string" ? sub.customer : sub.customer.id,
            stripeSubscriptionId: sub.id,
            stripePriceId:       priceId ?? null,
            currentPeriodStart:  new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000),
            currentPeriodEnd:    new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
          },
        });
        break;
      }

      /* ── Subscription deleted (cancelled and expired) ────────────────── */
      case "customer.subscription.deleted": {
        const sub    = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await db.subscription.updateMany({
          where: { userId },
          data:  { planId: "free", status: "active", stripeSubscriptionId: null, stripePriceId: null },
        });
        break;
      }

      /* ── Invoice paid → new billing period, reset minutes ───────────── */
      case "invoice.paid": {
        const invoice     = event.data.object as Stripe.Invoice;
        const stripeSubId = (invoice as unknown as { subscription?: string }).subscription;
        if (!stripeSubId) break;

        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const userId    = stripeSub.metadata?.userId;
        if (!userId) break;

        await db.subscription.updateMany({
          where: { userId },
          data:  {
            minutesUsed:       0,
            currentPeriodStart: new Date((stripeSub as unknown as { current_period_start: number }).current_period_start * 1000),
            currentPeriodEnd:   new Date((stripeSub as unknown as { current_period_end: number }).current_period_end * 1000),
            status: "active",
          },
        });
        break;
      }

      /* ── Payment failed ──────────────────────────────────────────────── */
      case "invoice.payment_failed": {
        const invoice     = event.data.object as Stripe.Invoice;
        const stripeSubId = (invoice as unknown as { subscription?: string }).subscription;
        if (!stripeSubId) break;

        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const userId    = stripeSub.metadata?.userId;
        if (!userId) break;

        await db.subscription.updateMany({
          where: { userId },
          data:  { status: "past_due" },
        });
        break;
      }

      default:
        // Unhandled event types — acknowledge with 200
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error handling event ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":   return "active";
    case "trialing": return "trialing";
    case "past_due": return "past_due";
    case "canceled":
    case "cancelled":
    case "incomplete_expired":
      return "cancelled";
    default:
      return stripeStatus;
  }
}
