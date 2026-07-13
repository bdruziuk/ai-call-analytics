import { getDictionary, hasLocale, type Locale } from "@/lib/dictionaries";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { NicheLandingPage } from "@/components/home/NicheLandingPage";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: string }> };

const META: Record<Locale, { title: string; description: string }> = {
  uk: {
    title: "AI-аналіз дзвінків для ресторанів | AI Call Analytics",
    description: "AI автоматично аналізує 100% дзвінків вашого ресторану, знаходить втрачені замовлення, контролює апсейл операторів і збільшує прибуток без додаткового персоналу.",
  },
  en: {
    title: "AI Call Analytics for Restaurants | AI Call Analytics",
    description: "AI automatically analyzes 100% of your restaurant's calls, catches lost orders, tracks upsell performance, and grows revenue without hiring extra staff.",
  },
  ru: {
    title: "AI-анализ звонков для ресторанов | AI Call Analytics",
    description: "AI автоматически анализирует 100% звонков вашего ресторана, находит потерянные заказы, контролирует апсейл операторов и увеличивает прибыль без найма персонала.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return META[lang];
}

export default async function RestaurantPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const [t, session] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
  ]);

  return (
    <NicheLandingPage
      lang={lang}
      isLoggedIn={!!session?.user}
      content={t.landing}
      source="restaurant"
    />
  );
}
