import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db.apiKey.deleteMany({ where: { id, userId: session.user.id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 60)
      : undefined;

  if (!name)
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const key = await db.apiKey.updateMany({
    where: { id, userId: session.user.id },
    data: { name },
  });

  if (key.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
