import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ calls: [], nextCursor: null });

  const { searchParams } = new URL(request.url);
  const cursor  = searchParams.get('cursor');
  const viewAs  = searchParams.get('viewAs');
  const period  = searchParams.get('period') ?? '';
  const limit   = Math.min(
    parseInt(searchParams.get('limit') ?? String(PAGE_SIZE), 10),
    100,
  );

  const { resolveUserId } = await import("@/lib/adminViewAs");
  const userId = await resolveUserId(session.user.id, session.user.email, viewAs ?? undefined);

  function periodSince(p: string): Date | null {
    const now = new Date();
    switch (p) {
      case 'today': { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
      case '3days': return new Date(now.getTime() - 3  * 86400_000);
      case 'week':  return new Date(now.getTime() - 7  * 86400_000);
      case 'month': return new Date(now.getTime() - 30 * 86400_000);
      default:      return null;
    }
  }
  const since = periodSince(period);

  const periodFilter = since ? { gte: since } : undefined;

  const createdAtFilter = {
    ...(since  ? { gte: since }           : {}),
    ...(cursor ? { lt: new Date(cursor) } : {}),
  };

  const whereBase = { userId, ...(periodFilter ? { createdAt: periodFilter } : {}) };

  const [calls, total, periodStats] = await Promise.all([
    db.call.findMany({
      where: {
        userId,
        ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    }),
    // Only count on first page (no cursor) to avoid extra query on pagination
    cursor ? Promise.resolve(null) : db.call.count({ where: whereBase }),
    // Compute period-accurate stats on first page only
    cursor ? Promise.resolve(null) : db.call.findMany({
      where: { ...whereBase, status: { in: ['completed', 'failed'] } },
      select: { status: true, score: true, saleStatus: true },
    }),
  ]);

  const hasMore = calls.length > limit;
  if (hasMore) calls.pop();

  const nextCursor = hasMore
    ? calls[calls.length - 1].createdAt.toISOString()
    : null;

  let stats: { averageScore: number; saleRate: number; failedCalls: number } | null = null;
  if (periodStats) {
    const completed = periodStats.filter((c) => c.status === 'completed');
    const scoredCalls = completed.filter((c) => c.score !== null);
    const avgScore = scoredCalls.length > 0
      ? Math.round(scoredCalls.reduce((s, c) => s + (c.score ?? 0), 0) / scoredCalls.length)
      : 0;
    const sold = completed.filter((c) => c.saleStatus === 'sold').length;
    const saleRate = completed.length > 0 ? Math.round((sold / completed.length) * 100) : 0;
    const failed = periodStats.filter((c) => c.status === 'failed').length;
    stats = { averageScore: avgScore, saleRate, failedCalls: failed };
  }

  return NextResponse.json({ calls, nextCursor, total, stats }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
