import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { SignInForm } from "@/components/auth/SignInForm";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { callbackUrl } = await searchParams;
  if (!hasLocale(lang)) notFound();

  const t = await getDictionary(lang);

  return (
    <main className="flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
      <SignInForm t={t} lang={lang} callbackUrl={callbackUrl} />
    </main>
  );
}
