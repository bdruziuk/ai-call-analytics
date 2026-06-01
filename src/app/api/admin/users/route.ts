import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PLAN_ORDER } from "@/lib/plans";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, name, password, planId = "free", isTestAccount = false } = body;

  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  if (!PLAN_ORDER.includes(planId)) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  try {
    const user = await db.user.create({
      data: {
        email:         email.trim().toLowerCase(),
        name:          name?.trim() || null,
        password:      hashed,
        isTestAccount: !!isTestAccount,
        subscription: {
          create: {
            planId,
            status:             "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd:   new Date(new Date().setMonth(new Date().getMonth() + 1)),
            minutesUsed:        0,
          },
        },
      },
      select: {
        id: true, email: true, name: true, isTestAccount: true, createdAt: true,
        subscription: { select: { planId: true } },
      },
    });

    return NextResponse.json({
      ...user,
      planId:    user.subscription?.planId ?? planId,
      createdAt: user.createdAt.toISOString(),
    }, { status: 201 });
  } catch (err) {
    console.error("[admin/users/POST]", err);
    return NextResponse.json({ error: "DB_ERROR", detail: String(err) }, { status: 500 });
  }
}
