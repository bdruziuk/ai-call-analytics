import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/lib/dictionaries";
import { RealtimeDashboard } from "@/components/admin/RealtimeDashboard";
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

export default async function RealtimePage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/${lang}/auth/signin`);

  if (!isAdminEmail(session.user.email)) {
    return (
      <main className="flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <ShieldOff size={28} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="max-w-xs text-sm text-slate-500">This page is restricted to administrators.</p>
        </div>
      </main>
    );
  }

  return <RealtimeDashboard lang={lang} />;
}
