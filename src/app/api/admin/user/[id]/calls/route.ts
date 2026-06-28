import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

function periodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "today": { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case "3days": return new Date(now.getTime() - 3  * 86400_000);
    case "week":  return new Date(now.getTime() - 7  * 86400_000);
    case "month": return new Date(now.getTime() - 30 * 86400_000);
    default:      return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "all";

  const since = periodStart(period);
  const dateFilter = since ? { gte: since } : undefined;

  const callFields = {
    id: true, fileName: true, status: true, source: true,
    score: true, saleStatus: true, language: true,
    errorMessage: true, reportType: true, durationSeconds: true,
    createdAt: true, salesProfileId: true,
  } as const;

  const [calls, profiles] = await Promise.all([
    db.call.findMany({
      where: { userId: id, ...(dateFilter && { createdAt: dateFilter }) },
      select: callFields,
      orderBy: { createdAt: "desc" },
    }),
    db.salesProfile.findMany({
      where: { userId: id },
      select: {
        id: true, name: true, description: true, photo: true,
        createdAt: true,
        calls: {
          where: dateFilter ? { createdAt: dateFilter } : undefined,
          select: callFields,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    calls: calls.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    profiles: profiles.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      calls: p.calls.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    })),
  });
}
