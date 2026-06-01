import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { db } from '@/lib/db';
import { processCall } from '@/services/call.service';

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: Props) {
  // Top-level guard: ensures we always return JSON even when an
  // unexpected error (DB connection, session, etc.) occurs before
  // the inner processCall try-catch.
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.call.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (existing.status === 'completed') {
      return NextResponse.json({ error: 'Call is already completed' }, { status: 409 });
    }

    // Already in-flight — return current state so the client keeps polling.
    if (existing.status === 'transcribing' || existing.status === 'analyzing') {
      const current = await db.call.findUnique({ where: { id } });
      return NextResponse.json(current);
    }

    try {
      const call = await processCall(id);
      return NextResponse.json(call);
    } catch (processingError) {
      // processCall already wrote status:'failed' + errorMessage to the DB
      // before rethrowing. Return the stored state so the client can poll it
      // without treating a domain failure as an HTTP 500.
      console.error('[POST /api/calls/[id]/process] processing error:', processingError);
      const failed = await db.call.findUnique({ where: { id } }).catch(() => null);
      return NextResponse.json(failed ?? { id, status: 'failed' });
    }
  } catch (err) {
    // Catch-all for unexpected infrastructure errors (DB down, session error, etc.)
    console.error('[POST /api/calls/[id]/process] unhandled error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
