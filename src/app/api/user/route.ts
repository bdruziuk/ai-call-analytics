import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { isValidBusinessType } from "@/lib/businessTypes";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "No user ID in session" }, { status: 400 });
  }

  const body = await request.json();

  const data: { name?: string; image?: string | null; binotelKey?: string | null; binotelSecret?: string | null; businessType?: string } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }

  if ("image" in body) {
    data.image = typeof body.image === "string" ? body.image : null;
  }

  if ("binotelKey" in body) {
    data.binotelKey = typeof body.binotelKey === "string" && body.binotelKey.trim() ? body.binotelKey.trim() : null;
  }

  if ("binotelSecret" in body) {
    data.binotelSecret = typeof body.binotelSecret === "string" && body.binotelSecret.trim() ? body.binotelSecret.trim() : null;
  }

  if ("businessType" in body) {
    const bt = body.businessType;
    if (!isValidBusinessType(bt)) return NextResponse.json({ error: "Invalid businessType" }, { status: 400 });
    data.businessType = bt;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json(user);
}
