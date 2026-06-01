import { notFound } from "next/navigation";
import { hasLocale, getDictionary } from "@/lib/dictionaries";
import { ApiDocsClient } from "@/components/api-docs/ApiDocsClient";

type Props = { params: Promise<{ lang: string }> };

export default async function ApiDocsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const t = await getDictionary(lang);

  return <ApiDocsClient t={t} lang={lang} />;
}
