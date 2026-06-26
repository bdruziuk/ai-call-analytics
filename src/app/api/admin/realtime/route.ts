import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const push = async () => {
        try {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          // 30 days ago for the chart
          const thirtyDaysAgo = new Date(todayStart);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

          const [recentCalls, totalUsers, totalCalls, minutesAgg, activeNow, callsToday, chartRaw, apiLogs] =
            await Promise.all([
              db.call.findMany({
                orderBy: { createdAt: "desc" },
                take: 100,
                select: {
                  id: true,
                  fileName: true,
                  source: true,
                  status: true,
                  reportType: true,
                  durationSeconds: true,
                  score: true,
                  createdAt: true,
                  user: { select: { email: true, name: true } },
                },
              }),
              db.user.count(),
              db.call.count(),
              db.subscription.aggregate({ _sum: { minutesUsed: true } }),
              db.call.count({
                where: { status: { in: ["queued", "transcribing", "analyzing"] } },
              }),
              db.call.count({ where: { createdAt: { gte: todayStart } } }),
              // Raw calls for the last 30 days — group by day in JS
              db.call.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true },
                orderBy: { createdAt: "asc" },
              }),
              // Last 100 API logs across all users
              db.apiLog.findMany({
                orderBy: { createdAt: "desc" },
                take: 100,
                select: {
                  id: true,
                  endpoint: true,
                  status: true,
                  statusCode: true,
                  createdAt: true,
                  userId: true,
                },
              }),
            ]);

          // Build day → count map (YYYY-MM-DD)
          const dayMap: Record<string, number> = {};
          for (let i = 0; i < 30; i++) {
            const d = new Date(thirtyDaysAgo);
            d.setDate(d.getDate() + i);
            dayMap[d.toISOString().slice(0, 10)] = 0;
          }
          for (const { createdAt } of chartRaw) {
            const key = createdAt.toISOString().slice(0, 10);
            if (key in dayMap) dayMap[key]++;
          }
          const callsPerDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

          send({
            calls: recentCalls.map((c) => ({
              id: c.id,
              fileName: c.fileName,
              source: c.source,
              status: c.status,
              reportType: c.reportType,
              durationSeconds: c.durationSeconds,
              score: c.score,
              createdAt: c.createdAt.toISOString(),
              userEmail: c.user?.email ?? null,
              userName: c.user?.name ?? null,
            })),
            stats: {
              totalUsers,
              totalCalls,
              totalMinutes: minutesAgg._sum.minutesUsed ?? 0,
              activeNow,
              callsToday,
            },
            callsPerDay,
            apiLogs: apiLogs.map((l) => ({
              id: l.id,
              endpoint: l.endpoint,
              status: l.status,
              statusCode: l.statusCode,
              userId: l.userId,
              createdAt: l.createdAt.toISOString(),
            })),
          });
        } catch (err) {
          console.error("[realtime]", err);
        }
      };

      await push();
      const interval = setInterval(push, 3000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
