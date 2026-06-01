import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateSubscription } from "@/lib/planLimits";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ manager?: string }>;
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/${lang}/auth/signin`);

  // Guard: session cookie may outlive the DB record (e.g. after a DB reset).
  const dbUserCheck = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { isTestAccount: true },
  });
  if (!dbUserCheck) redirect(`/${lang}/auth/signin`);

  const { manager } = await searchParams;

  const [t, profiles, sub] = await Promise.all([
    getDictionary(lang),
    db.salesProfile.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, description: true, photo: true },
      orderBy: { name: "asc" },
    }),
    getOrCreateSubscription(session.user.id),
  ]);

  return (
    <DashboardClient
      t={t}
      lang={lang}
      profiles={profiles}
      initialManagerFilter={manager ?? ""}
      planId={sub.planId}
      isTestAccount={!!dbUserCheck.isTestAccount}
    />
  );
}
