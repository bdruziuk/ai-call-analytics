import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { token } = await searchParams;
  if (!hasLocale(lang)) notFound();

  const t = await getDictionary(lang);

  return (
    <main className="flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
      <ResetPasswordForm t={t} lang={lang} token={token ?? null} />
    </main>
  );
}
