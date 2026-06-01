import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "TOKEN_REQUIRED" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    const record = await db.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.expiresAt < new Date()) {
      // Delete expired token if found
      if (record) await db.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ error: "TOKEN_INVALID" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { email: record.email },
      data: { password: hashed },
    });

    // Invalidate the token immediately after use
    await db.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
