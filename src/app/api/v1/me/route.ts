import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth)
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}
