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

  const [calls, total] = await Promise.all([
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
  ]);

  const hasMore = calls.length > limit;
  if (hasMore) calls.pop();

  const nextCursor = hasMore
    ? calls[calls.length - 1].createdAt.toISOString()
    : null;

  return NextResponse.json({ calls, nextCursor, total }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
