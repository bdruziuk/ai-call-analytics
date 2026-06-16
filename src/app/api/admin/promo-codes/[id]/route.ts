import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

type Props = { params: Promise<{ id: string }> };

/* ── DELETE /api/admin/promo-codes/[id] — delete an unused code ────────── */

export async function DELETE(_: Request, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const code = await db.promoCode.findUnique({ where: { id } });
  if (!code) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (code.usedBy) {
    return NextResponse.json({ error: "ALREADY_USED" }, { status: 409 });
  }

  await db.promoCode.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
