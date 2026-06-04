import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { RestaurantLandingPage } from "@/components/home/RestaurantLandingPage";

type Props = { params: Promise<{ lang: string }> };

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const [, session] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
  ]);

  const isLoggedIn = !!session?.user;

  return <RestaurantLandingPage lang={lang} isLoggedIn={isLoggedIn} />;
}
