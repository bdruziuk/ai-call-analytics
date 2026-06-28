import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { fetchOwnerAnalytics, fetchMarketerAnalytics } from "@/lib/fetchDashboardAnalytics";

export const dynamic = "force-dynamic";

function periodSince(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "today":  { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case "3days":  return new Date(now.getTime() - 3  * 86400_000);
    case "week":   return new Date(now.getTime() - 7  * 86400_000);
    case "month":  return new Date(now.getTime() - 30 * 86400_000);
    default:       return null;
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period  = searchParams.get("period") ?? "month";
  const viewAs  = searchParams.get("viewAs") ?? undefined;

  const { resolveUserId } = await import("@/lib/adminViewAs");
  const userId = await resolveUserId(session.user.id, session.user.email, viewAs);

  const since = periodSince(period);

  const [ownerAnalytics, marketerAnalytics] = await Promise.all([
    fetchOwnerAnalytics(userId, since),
    fetchMarketerAnalytics(userId, since),
  ]);

  return NextResponse.json({ ownerAnalytics, marketerAnalytics });
}
