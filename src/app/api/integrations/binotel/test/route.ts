import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const userCreds = await db.user.findUnique({
    where: { id: auth.userId },
    select: { binotelKey: true, binotelSecret: true },
  });
  const bKey    = userCreds?.binotelKey    ?? "";
  const bSecret = userCreds?.binotelSecret ?? "";

  if (!bKey || !bSecret) {
    return NextResponse.json({ error: "binotelKey/binotelSecret not set" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  // Query recent calls to inspect the recording URL format returned by Binotel API
  const res = await fetch("https://api.binotel.com/api/4.0/stats/general-calls-for-period.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: bKey, secret: bSecret, startPeriod: dayAgo, stopPeriod: now }),
  });
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: "non-JSON response", status: res.status, body: text.slice(0, 500) });
  }
  const data = await res.json() as Record<string, unknown>;

  const calls = (Array.isArray(data.generalCalls) ? data.generalCalls : []) as Record<string, unknown>[];
  const withRecording = calls.find(c => c.file || c.fileLink || c.record_url || c.recordLink || c.recordUrl);

  return NextResponse.json({
    apiStatus: res.status,
    totalCalls: calls.length,
    firstCall: calls[0] ?? null,
    firstCallWithRecording: withRecording ?? null,
    allFieldNames: calls[0] ? Object.keys(calls[0]) : [],
    rawDataKeys: Object.keys(data),
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  if (!VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number])) {
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });
  }

  const userCreds = await db.user.findUnique({
    where: { id: auth.userId },
    select: { binotelKey: true, binotelSecret: true },
  });
  const bKey    = userCreds?.binotelKey    ?? "";
  const bSecret = userCreds?.binotelSecret ?? "";

  let body: Record<string, unknown>;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text));
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse request body" }, { status: 400 });
  }

  console.log("[binotel-test] FULL BODY:", JSON.stringify(body));
  console.log("[binotel-test] credentials: bKey set =", !!bKey, "bSecret set =", !!bSecret);

  logApiRequest(auth.userId, "binotel", "skipped", 200);
  return NextResponse.json({ received: true, bodyKeys: Object.keys(body) });
}
