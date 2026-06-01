import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, lang } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const normalised = email.trim().toLowerCase();

    // Always return 200 regardless of whether the email exists — prevents
    // user enumeration attacks.
    const user = await db.user.findUnique({ where: { email: normalised } });

    if (user) {
      // Delete any existing unexpired tokens for this email
      await db.passwordResetToken.deleteMany({ where: { email: normalised } });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.passwordResetToken.create({
        data: { email: normalised, token, expiresAt },
      });

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const safeLang = typeof lang === "string" && lang ? lang : "en";
      const resetUrl = `${baseUrl}/${safeLang}/auth/reset-password?token=${token}`;

      await sendPasswordResetEmail(normalised, resetUrl, safeLang);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
