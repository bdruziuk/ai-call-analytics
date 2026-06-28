import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { PLAN_ORDER } from "@/lib/plans";
import { isValidBusinessType } from "@/lib/businessTypes";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // ── isTestAccount ───────────────────────────────────────────────────────
  if (typeof body.isTestAccount === "boolean") {
    try {
      const user = await db.user.update({
        where: { id },
        data: { isTestAccount: body.isTestAccount },
        select: { id: true, email: true, isTestAccount: true },
      });
      return NextResponse.json(user);
    } catch (err) {
      console.error("[admin/user/PATCH isTestAccount]", err);
      return NextResponse.json({ error: "DB_ERROR", detail: String(err) }, { status: 500 });
    }
  }

  // ── planId ──────────────────────────────────────────────────────────────
  if (typeof body.planId === "string") {
    if (!PLAN_ORDER.includes(body.planId as never)) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
    }

    try {
      await db.subscription.upsert({
        where:  { userId: id },
        update: { planId: body.planId },
        create: {
          userId:            id,
          planId:            body.planId,
          status:            "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd:   new Date(new Date().setMonth(new Date().getMonth() + 1)),
          minutesUsed:       0,
        },
      });
      return NextResponse.json({ id, planId: body.planId });
    } catch (err) {
      console.error("[admin/user/PATCH planId]", err);
      return NextResponse.json({ error: "DB_ERROR", detail: String(err) }, { status: 500 });
    }
  }

  // ── businessType ────────────────────────────────────────────────────────
  if (typeof body.businessType === "string") {
    if (!isValidBusinessType(body.businessType)) {
      return NextResponse.json({ error: "Invalid businessType" }, { status: 400 });
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.user.update({ where: { id }, data: { businessType: body.businessType } as any });
      return NextResponse.json({ id, businessType: body.businessType });
    } catch (err) {
      console.error("[admin/user/PATCH businessType]", err);
      return NextResponse.json({ error: "DB_ERROR", detail: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  const self = await db.user.findUnique({ where: { email: session!.user!.email! }, select: { id: true } });
  if (self?.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    await db.user.delete({ where: { id } });   // cascades to calls, profiles, subscription, keys
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/user/DELETE]", err);
    return NextResponse.json({ error: "DB_ERROR", detail: String(err) }, { status: 500 });
  }
}
