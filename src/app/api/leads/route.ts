import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { name, restaurant, phone, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const adminEmails = process.env.ADMIN_EMAILS ?? "";
    const to = adminEmails.split(",").map((e) => e.trim()).filter(Boolean).join(", ");

    const body = `
Новий лід з лендингу ресторану:

Ім'я:          ${name}
Заклад:        ${restaurant || "—"}
Телефон:       ${phone || "—"}
Email:         ${email}
Час:           ${new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}
    `.trim();

    if (process.env.SMTP_HOST && to) {
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from:    process.env.SMTP_FROM ?? "noreply@aicallanalytics.com",
        to,
        subject: `🍕 Новий лід: ${name} — ${restaurant || email}`,
        text: body,
        html: `<pre style="font-family:sans-serif;font-size:14px;line-height:1.7">${body}</pre>`,
      });
    } else {
      // Dev fallback
      console.info("[lead]", { name, restaurant, phone, email });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[leads]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
