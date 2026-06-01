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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Calls assigned to this profile are unlinked (salesProfileId → null) rather than
    // deleted, so the call history is preserved.
    await db.call.updateMany({
      where: { salesProfileId: id },
      data:  { salesProfileId: null },
    });
    await db.salesProfile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/profiles/DELETE]", err);
    return NextResponse.json({ error: "DB_ERROR", detail: String(err) }, { status: 500 });
  }
}
