import nodemailer from "nodemailer";

/* ─────────────────────────────────────────────────────────────────────────────
   Email utility
   Configure via env:
     SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (true/false),
     SMTP_USER, SMTP_PASS, SMTP_FROM (default noreply@…)

   In development with no SMTP configured the reset URL is printed to the
   server console so you can still test the flow without an email provider.
   ───────────────────────────────────────────────────────────────────────────── */

function createTransport() {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const subjects: Record<string, string> = {
  uk: "Скидання пароля — AI Call Analytics",
  ru: "Сброс пароля — AI Call Analytics",
  en: "Password Reset — AI Call Analytics",
};

const bodies: Record<
  string,
  (url: string) => { text: string; html: string }
> = {
  uk: (url) => ({
    text: `Для скидання пароля перейдіть за посиланням:\n\n${url}\n\nПосилання дійсне 1 годину.`,
    html: `<p>Для скидання пароля натисніть посилання нижче:</p>
<p><a href="${url}">${url}</a></p>
<p><small>Посилання дійсне 1 годину. Якщо ви не запитували скидання пароля — ігноруйте цей лист.</small></p>`,
  }),
  ru: (url) => ({
    text: `Для сброса пароля перейдите по ссылке:\n\n${url}\n\nСсылка действительна 1 час.`,
    html: `<p>Для сброса пароля нажмите ссылку ниже:</p>
<p><a href="${url}">${url}</a></p>
<p><small>Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — проигнорируйте это письмо.</small></p>`,
  }),
  en: (url) => ({
    text: `To reset your password, visit:\n\n${url}\n\nThis link expires in 1 hour.`,
    html: `<p>Click the link below to reset your password:</p>
<p><a href="${url}">${url}</a></p>
<p><small>This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</small></p>`,
  }),
};

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  lang = "en",
) {
  const safeLang = lang in bodies ? lang : "en";
  const subject = subjects[safeLang];
  const { text, html } = bodies[safeLang](resetUrl);

  const transport = createTransport();

  if (!transport) {
    // Dev fallback — log to console
    console.warn("⚠️  SMTP not configured. Password reset URL:");
    console.warn(`   → ${resetUrl}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@aicallanalytics.com",
    to,
    subject,
    text,
    html,
  });
}
