import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since"); // ISO date string — only show groups with calls after this
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all calls with enough fields to detect duplicates
  const calls = await db.call.findMany({
    select: {
      id: true,
      userId: true,
      externalId: true,
      fileName: true,
      source: true,
      status: true,
      score: true,
      durationSeconds: true,
      internalNumber: true,
      salesProfileId: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group duplicates by externalId (same generalCallID from Binotel)
  const byExternalId = new Map<string, typeof calls>();
  for (const c of calls) {
    if (!c.externalId) continue;
    const key = `${c.userId}::${c.externalId}`;
    if (!byExternalId.has(key)) byExternalId.set(key, []);
    byExternalId.get(key)!.push(c);
  }

  // Also group by (userId + fileName) as a fallback signal
  const byFileName = new Map<string, typeof calls>();
  for (const c of calls) {
    const key = `${c.userId}::${c.fileName}`;
    if (!byFileName.has(key)) byFileName.set(key, []);
    byFileName.get(key)!.push(c);
  }

  // Also group by (userId + score + durationSeconds) — same call = same duration & score
  const bySignature = new Map<string, typeof calls>();
  for (const c of calls) {
    if (c.score == null || c.durationSeconds == null) continue;
    const key = `${c.userId}::${c.score}::${c.durationSeconds}::${c.internalNumber ?? ""}`;
    if (!bySignature.has(key)) bySignature.set(key, []);
    bySignature.get(key)!.push(c);
  }

  const sinceDate = since ? new Date(since) : null;
  const afterSince = (g: typeof calls) =>
    !sinceDate || g.some((c) => c.createdAt >= sinceDate);

  const dupsByExternalId = [...byExternalId.values()].filter((g) => g.length > 1 && afterSince(g));
  const dupsByFileName   = [...byFileName.values()].filter((g) => g.length > 1 && afterSince(g));
  const dupsBySignature  = [...bySignature.values()].filter((g) => g.length > 1 && afterSince(g));

  // Calls that have NO externalId at all
  const noExternalId = calls.filter((c) => !c.externalId);

  const serialize = (g: typeof calls) =>
    g.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));

  return NextResponse.json({
    totalCalls: calls.length,
    noExternalId: noExternalId.length,
    dupsByExternalId: dupsByExternalId.map(serialize),
    dupsByFileName:   dupsByFileName.map(serialize),
    dupsBySignature:  dupsBySignature.map(serialize),
  });
}
