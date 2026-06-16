import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { notFound, redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { ShieldOff } from "lucide-react";

type Props = { params: Promise<{ lang: string }> };

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export default async function AdminPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/${lang}/auth/signin`);

  const t = await getDictionary(lang);

  if (!isAdminEmail(session.user.email)) {
    return (
      <main className="flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <ShieldOff size={28} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.admin.accessDenied}</h1>
          <p className="max-w-xs text-sm text-slate-500">{t.admin.accessDeniedDesc}</p>
        </div>
      </main>
    );
  }

  const [users, rawPromos] = await Promise.all([
    db.user.findMany({
    include: {
      salesProfiles: {
        include: {
          calls: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "asc" },
      },
      calls: { orderBy: { createdAt: "desc" } },
      subscription: { select: { planId: true, minutesUsed: true } },
      _count: { select: { calls: true, salesProfiles: true } },
    },
    orderBy: { createdAt: "desc" },
    }),
    db.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const promoCodes = rawPromos.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    usedAt:    p.usedAt?.toISOString() ?? null,
  }));

  // Serialise Date → string so client components receive plain JSON
  const serialised = users.map((u: typeof users[number]) => ({
    ...u,
    planId:      u.subscription?.planId     ?? "free",
    minutesUsed: u.subscription?.minutesUsed ?? 0,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    calls: u.calls.map((c: typeof u.calls[number]) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    salesProfiles: u.salesProfiles.map((p: typeof u.salesProfiles[number]) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      calls: p.calls.map((c: typeof p.calls[number]) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    })),
  }));

  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-50">
      <AdminPanel t={t} lang={lang} initialUsers={serialised} initialPromoCodes={promoCodes} />
    </main>
  );
}
