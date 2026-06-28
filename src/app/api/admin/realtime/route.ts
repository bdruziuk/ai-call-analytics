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

          const [recentCalls, totalUsers, totalCalls, minutesAgg, activeNow, callsToday, totalApiCalls, apiCallsToday, minutesTodayAgg, callsTodayRaw, apiLogs, apiTodayRaw, allUsers] =
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
              db.apiLog.count(),
              db.apiLog.count({ where: { createdAt: { gte: todayStart } } }),
              db.call.aggregate({ _sum: { durationSeconds: true }, where: { createdAt: { gte: todayStart }, status: "completed" } }),
              // Last 48h of calls — client will filter to its local today and bucket by local hour
              db.call.findMany({
                where: { createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
                select: { createdAt: true },
              }),
              // Last 100 API logs across all users (for the panel)
              db.apiLog.findMany({
                orderBy: { createdAt: "desc" },
                take: 100,
                select: { id: true, endpoint: true, status: true, statusCode: true, createdAt: true, userId: true },
              }),
              // Last 48h of API logs — client will filter to its local today and bucket by local hour
              db.apiLog.findMany({
                where: { createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
                select: { createdAt: true },
              }),
              // User map for joining into API logs
              db.user.findMany({ select: { id: true, email: true, name: true } }),
            ]);

          const userMap = new Map(allUsers.map((u) => [u.id, u]));

          // Send raw ISO timestamps — client buckets by its own local timezone
          const todayTimestamps = {
            calls: callsTodayRaw.map((c) => c.createdAt.toISOString()),
            api:   apiTodayRaw.map((c) => c.createdAt.toISOString()),
          };

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
              minutesToday: Math.round((minutesTodayAgg._sum.durationSeconds ?? 0) / 60),
              activeNow,
              callsToday,
              totalApiCalls,
              apiCallsToday,
            },
            todayTimestamps,
            apiLogs: apiLogs.map((l) => {
              const u = userMap.get(l.userId);
              return {
                id: l.id,
                endpoint: l.endpoint,
                status: l.status,
                statusCode: l.statusCode,
                userId: l.userId,
                userEmail: u?.email ?? null,
                userName: u?.name ?? null,
                createdAt: l.createdAt.toISOString(),
              };
            }),
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
