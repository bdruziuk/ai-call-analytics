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
  const limit   = Math.min(
    parseInt(searchParams.get('limit') ?? String(PAGE_SIZE), 10),
    100,
  );

  const { resolveUserId } = await import("@/lib/adminViewAs");
  const userId = await resolveUserId(session.user.id, session.user.email, viewAs ?? undefined);

  const calls = await db.call.findMany({
    where: {
      userId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,   // fetch one extra to detect whether there is a next page
  });

  const hasMore    = calls.length > limit;
  if (hasMore) calls.pop();

  const nextCursor = hasMore
    ? calls[calls.length - 1].createdAt.toISOString()
    : null;

  return NextResponse.json({ calls, nextCursor }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
