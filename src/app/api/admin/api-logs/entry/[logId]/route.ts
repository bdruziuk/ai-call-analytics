import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ logId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { logId } = await params;
  await db.apiLog.delete({ where: { id: logId } });
  return NextResponse.json({ deleted: logId });
}
