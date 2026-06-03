
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { db } from '@/lib/db';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: Props) {
  const { id } = await params;

  const call = await db.call.findUnique({
    where: { id },
  });

  if (!call) {
    return NextResponse.json(
      { error: 'Call not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(call);
}

export async function DELETE(_: Request, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const call = await db.call.findUnique({ where: { id } });
  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 });
  }
  if (call.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.call.delete({ where: { id } });

  return NextResponse.json({ success: true });
}