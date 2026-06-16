import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const CONSENT_VERSION = "v1.0";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function POST(request: Request) {
  try {
    const { name, email, password, analyticsConsent, marketingConsent, promoCode } =
      await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "EMAIL_PASSWORD_REQUIRED" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    // Server-side consent validation — never trust the client alone
    if (!analyticsConsent) {
      return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
    }

    // Validate promo code before doing anything else
    const promoCodeTrimmed = typeof promoCode === "string" ? promoCode.trim().toUpperCase() : "";
    let promo: { id: string; planId: string } | null = null;

    if (promoCodeTrimmed) {
      promo = await db.promoCode.findUnique({
        where:  { code: promoCodeTrimmed },
        select: { id: true, planId: true, usedBy: true },
      }) as { id: string; planId: string; usedBy: string | null } | null;

      if (!promo) {
        return NextResponse.json({ error: "PROMO_INVALID" }, { status: 400 });
      }
      if ((promo as unknown as { usedBy: string | null }).usedBy) {
        return NextResponse.json({ error: "PROMO_USED" }, { status: 400 });
      }
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const now    = new Date();

    // Create user
    const user = await db.user.create({
      data: {
        name: name || null,
        email,
        password: hashed,
        // Required analytics consent
        analyticsConsentAccepted:   true,
        analyticsConsentAcceptedAt: now,
        analyticsConsentVersion:    CONSENT_VERSION,
        // Optional marketing consent
        marketingDemoConsentAccepted:   !!marketingConsent,
        marketingDemoConsentAcceptedAt: marketingConsent ? now : null,
        marketingDemoConsentVersion:    marketingConsent ? CONSENT_VERSION : null,
      },
    });

    // If a valid promo code was provided, create subscription with promo plan
    // and mark the code as used — atomically via $transaction
    if (promo) {
      await db.$transaction([
        db.subscription.create({
          data: {
            userId:             user.id,
            planId:             promo.planId,
            status:             "active",
            currentPeriodStart: startOfMonth(now),
            currentPeriodEnd:   endOfMonth(now),
            minutesUsed:        0,
          },
        }),
        db.promoCode.update({
          where: { id: promo.id },
          data:  { usedBy: user.id, usedAt: now },
        }),
      ]);

      return NextResponse.json(
        { id: user.id, email: user.email, planApplied: promo.planId },
        { status: 201 },
      );
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
