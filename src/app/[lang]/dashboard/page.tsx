import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateSubscription } from "@/lib/planLimits";
import { fetchOwnerAnalytics, fetchMarketerAnalytics } from "@/lib/fetchDashboardAnalytics";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ manager?: string; viewAs?: string }>;
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/${lang}/auth/signin`);

  const { resolveUserId } = await import("@/lib/adminViewAs");
  const { manager, viewAs } = await searchParams;
  const userId = await resolveUserId(session.user.id, session.user.email, viewAs);

  // Guard: session cookie may outlive the DB record (e.g. after a DB reset).
  const dbUserCheck = await db.user.findUnique({
    where:  { id: userId },
    select: { isTestAccount: true },
  });
  if (!dbUserCheck) redirect(`/${lang}/auth/signin`);

  const [t, profiles, sub, ownerAnalytics, marketerAnalytics] = await Promise.all([
    getDictionary(lang),
    db.salesProfile.findMany({
      where: { userId },
      select: { id: true, name: true, description: true, photo: true },
      orderBy: { name: "asc" },
    }),
    getOrCreateSubscription(userId),
    fetchOwnerAnalytics(userId),
    fetchMarketerAnalytics(userId),
  ]);

  return (
    <DashboardClient
      t={t}
      lang={lang}
      profiles={profiles}
      initialManagerFilter={manager ?? ""}
      planId={sub.planId}
      isTestAccount={!!dbUserCheck.isTestAccount}
      viewAs={viewAs}
      ownerAnalytics={ownerAnalytics}
      marketerAnalytics={marketerAnalytics}
    />
  );
}
