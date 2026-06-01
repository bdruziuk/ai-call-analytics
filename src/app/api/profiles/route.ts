import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateSubscription } from "@/lib/planLimits";
import { getPlan } from "@/lib/plans";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([], { status: 200 });

  const profiles = await db.salesProfile.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { calls: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(profiles);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, photo } = await request.json();
  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const userExists = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!userExists)
    return NextResponse.json({ error: "User not found. Please sign out and sign in again." }, { status: 401 });

  // Enforce per-plan manager limit
  const sub = await getOrCreateSubscription(session.user.id);
  const plan = getPlan(sub.planId);
  if (plan.maxManagers !== null) {
    const count = await db.salesProfile.count({ where: { userId: session.user.id } });
    if (count >= plan.maxManagers) {
      return NextResponse.json(
        { error: "manager_limit_exceeded", limit: plan.maxManagers },
        { status: 403 },
      );
    }
  }

  const profile = await db.salesProfile.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      description: description?.trim() || null,
      photo: photo?.trim() || null,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
