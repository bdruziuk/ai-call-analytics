import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function ForgotPasswordPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const t = await getDictionary(lang);

  return (
    <main className="flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
      <ForgotPasswordForm t={t} lang={lang} />
    </main>
  );
}
