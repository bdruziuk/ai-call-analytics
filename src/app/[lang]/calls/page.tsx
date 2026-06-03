import Link from "next/link";
import { db } from "@/lib/db";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { CallsTableClient } from "@/components/calls/CallsTableClient";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function CallsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/${lang}/auth/signin`);

  const PAGE = 30;

  const [t, rawCalls, profiles] = await Promise.all([
    getDictionary(lang),
    db.call.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    PAGE + 1,
    }),
    db.salesProfile.findMany({
      where:  { userId: session.user.id },
      select: { id: true, name: true },
    }),
  ]);

  const hasMore  = rawCalls.length > PAGE;
  if (hasMore) rawCalls.pop();
  const nextCursor = hasMore ? rawCalls[rawCalls.length - 1].createdAt.toISOString() : null;

  // Serialise Date objects for the client component
  type CallRow = typeof rawCalls[number];
  const serialisedCalls = rawCalls.map((c: CallRow) => ({
    id: c.id,
    fileName: c.fileName,
    status: c.status,
    product: c.product,
    saleStatus: c.saleStatus,
    score: c.score,
    createdAt: c.createdAt.toISOString(),
    salesProfileId: c.salesProfileId,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t.calls.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.calls.subtitle}</p>
        </div>

        <Link
          href={`/${lang}/dashboard`}
          className="self-start rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm sm:self-auto"
        >
          {t.calls.uploadCall}
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CallsTableClient
          t={t}
          lang={lang}
          initialCalls={serialisedCalls}
          initialNextCursor={nextCursor}
          profiles={profiles}
        />
      </div>
    </main>
  );
}
