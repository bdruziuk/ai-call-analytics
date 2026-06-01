import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function RegisterPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const t = await getDictionary(lang);

  return (
    <main className="flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
      <RegisterForm t={t} lang={lang} />
    </main>
  );
}
