import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { ProfilesClient } from "@/components/profiles/ProfilesClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getOrCreateSubscription } from "@/lib/planLimits";
import { getPlan } from "@/lib/plans";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ viewAs?: string }> };

export default async function ProfilesPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { viewAs } = await searchParams;
  if (!hasLocale(lang)) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/${lang}/auth/signin`);

  const { resolveUserId } = await import("@/lib/adminViewAs");
  const userId = await resolveUserId(session.user.id, session.user.email, viewAs);

  const [t, profiles, sub, dbUser] = await Promise.all([
    getDictionary(lang),
    db.salesProfile.findMany({
      where: { userId },
      include: {
        calls: {
          where: { status: "completed" },
          select: { score: true, saleStatus: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { calls: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getOrCreateSubscription(userId),
    db.user.findUnique({
      where:  { id: userId },
      select: { isTestAccount: true },
    }),
  ]);

  // Test accounts bypass the manager limit
  const maxManagers = dbUser?.isTestAccount ? null : getPlan(sub.planId).maxManagers;

  // Serialise Date → string so the client component receives plain JSON
  type ProfileRow = typeof profiles[number];
  type CallRow    = ProfileRow["calls"][number];
  const serialised = profiles.map((p: ProfileRow) => ({
    ...p,
    calls: p.calls.map((c: CallRow) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  }));

  return (
    <main className="mx-auto max-w-6xl p-8">
      <ProfilesClient t={t} lang={lang} initialProfiles={serialised} maxManagers={maxManagers} />
    </main>
  );
}
