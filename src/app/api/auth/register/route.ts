import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const CONSENT_VERSION = "v1.0";

export async function POST(request: Request) {
  try {
    const { name, email, password, analyticsConsent, marketingConsent } = await request.json();

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

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const now = new Date();

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

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
