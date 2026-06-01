
import { NextResponse } from 'next/server';
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