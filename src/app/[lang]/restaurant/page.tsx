import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { RestaurantLandingPage } from "@/components/home/RestaurantLandingPage";

type Props = { params: Promise<{ lang: string }> };

export default async function RestaurantPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const [t, session] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
  ]);

  return (
    <RestaurantLandingPage
      lang={lang}
      isLoggedIn={!!session?.user}
      t={t}
    />
  );
}
