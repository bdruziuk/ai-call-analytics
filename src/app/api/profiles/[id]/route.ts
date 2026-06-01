import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

async function getOwned(profileId: string, userId: string) {
  return db.salesProfile.findFirst({ where: { id: profileId, userId } });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await getOwned(id, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, description, photo } = await request.json();
  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const updated = await db.salesProfile.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      photo: photo?.trim() || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await getOwned(id, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.salesProfile.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
