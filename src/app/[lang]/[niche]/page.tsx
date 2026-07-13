import { hasLocale, locales } from "@/lib/dictionaries";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { NicheLandingPage } from "@/components/home/NicheLandingPage";
import { getNicheBySlug, nicheSlugs } from "@/content/niches/registry";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: string; niche: string }> };

export function generateStaticParams() {
  return locales.flatMap((lang) => nicheSlugs.map((niche) => ({ lang, niche })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, niche } = await params;
  if (!hasLocale(lang)) return {};
  const def = getNicheBySlug(niche);
  if (!def) return {};
  const meta = def.meta[lang];
  return { title: meta.title, description: meta.description };
}

export default async function NichePage({ params }: Props) {
  const { lang, niche } = await params;
  if (!hasLocale(lang)) notFound();

  const def = getNicheBySlug(niche);
  if (!def) notFound();

  const session = await getServerSession(authOptions);

  return (
    <NicheLandingPage
      lang={lang}
      isLoggedIn={!!session?.user}
      content={def.content[lang]}
      integrations={def.integrations}
      source={def.slug}
    />
  );
}
