import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/auth";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getOrCreateSubscription } from "@/lib/planLimits";
import { getPlan } from "@/lib/plans";

type Props = {
  params:       Promise<{ lang: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export default async function SettingsPage({ params, searchParams }: Props) {
  const { lang }    = await params;
  const { payment } = await searchParams;

  if (!hasLocale(lang)) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/${lang}/auth/signin`);

  // Fetch the user record first — if the session userId is stale (e.g. after
  // a DB reset in dev) the user won't exist and downstream FK-constrained
  // queries (like subscription.create) would blow up with a P2003 error.
  const dbUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: {
      name:                          true,
      image:                         true,
      isTestAccount:                 true,
      binotelKey:                    true,
      binotelSecret:                 true,
      analyticsConsentAccepted:      true,
      analyticsConsentAcceptedAt:    true,
      analyticsConsentVersion:       true,
      marketingDemoConsentAccepted:  true,
      marketingDemoConsentAcceptedAt: true,
      marketingDemoConsentVersion:   true,
    },
  });

  // Stale session — user no longer in DB
  if (!dbUser) redirect(`/${lang}/auth/signin`);

  const [t, rawKeys, sub] = await Promise.all([
    getDictionary(lang),
    db.apiKey.findMany({
      where:   { userId: session.user.id },
      select:  { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    getOrCreateSubscription(session.user.id),
  ]);

  type KeyRow = typeof rawKeys[number];
  const apiKeys = rawKeys.map((k: KeyRow) => ({
    ...k,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt:  k.createdAt.toISOString(),
  }));

  const plan = getPlan(sub.planId);

  const paymentStatus: "success" | "cancelled" | null =
    payment === "success"   ? "success"   :
    payment === "cancelled" ? "cancelled" :
    null;

  return (
    <SettingsClient
      t={t}
      lang={lang}
      user={{
        name:  dbUser.name  ?? session.user.name  ?? null,
        email: session.user.email ?? null,
        image: dbUser.image ?? session.user.image ?? null,
      }}
      apiKeys={apiKeys}
      subscription={{
        planId:                sub.planId,
        minutesUsed:           sub.minutesUsed,
        minutesLimit:          plan.minutesPerMonth,
        currentPeriodEnd:      sub.currentPeriodEnd.toISOString(),
        hasStripeSubscription: !!sub.stripeSubscriptionId,
      }}
      paymentStatus={paymentStatus}
      isTestAccount={!!dbUser.isTestAccount}
      binotelKey={dbUser.binotelKey ?? null}
      binotelSecret={dbUser.binotelSecret ?? null}
      consent={{
        analyticsAccepted:   !!dbUser.analyticsConsentAccepted,
        analyticsAcceptedAt: dbUser.analyticsConsentAcceptedAt?.toISOString() ?? null,
        analyticsVersion:    dbUser.analyticsConsentVersion ?? null,
        marketingAccepted:   !!dbUser.marketingDemoConsentAccepted,
        marketingAcceptedAt: dbUser.marketingDemoConsentAcceptedAt?.toISOString() ?? null,
        marketingVersion:    dbUser.marketingDemoConsentVersion ?? null,
      }}
    />
  );
}
