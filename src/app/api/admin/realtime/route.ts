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

          const [recentCalls, totalUsers, totalCalls, minutesAgg, activeNow, callsToday, totalApiCalls, callsTodayRaw, apiLogs, apiTodayRaw] =
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
              // Today's calls for hourly chart
              db.call.findMany({
                where: { createdAt: { gte: todayStart } },
                select: { createdAt: true },
              }),
              // Last 100 API logs across all users (for the panel)
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
              // Today's API logs for hourly chart
              db.apiLog.findMany({
                where: { createdAt: { gte: todayStart } },
                select: { createdAt: true },
              }),
            ]);

          // Build hour → count map (0–23) for today
          const currentHour = new Date().getHours();
          const hourMap:    number[] = Array(currentHour + 1).fill(0);
          const apiHourMap: number[] = Array(currentHour + 1).fill(0);
          for (const { createdAt } of callsTodayRaw) {
            const h = createdAt.getHours();
            if (h <= currentHour) hourMap[h]++;
          }
          for (const { createdAt } of apiTodayRaw) {
            const h = createdAt.getHours();
            if (h <= currentHour) apiHourMap[h]++;
          }
          const callsPerDay = hourMap.map((count, h) => ({
            hour: h,
            label: `${String(h).padStart(2, "0")}:00`,
            count,
            api: apiHourMap[h] ?? 0,
          }));

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
              totalApiCalls,
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
