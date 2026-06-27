import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";

export async function GET() {
  // Temporary diagnostic endpoint — finds first user with Binotel credentials in DB
  const userCreds = await db.user.findFirst({
    where: { binotelKey: { not: "" }, binotelSecret: { not: "" } },
    select: { id: true, binotelKey: true, binotelSecret: true },
  });

  if (!userCreds?.binotelKey || !userCreds?.binotelSecret) {
    return NextResponse.json({ error: "No user with binotelKey/binotelSecret found in DB" }, { status: 400 });
  }

  const bKey    = userCreds.binotelKey;
  const bSecret = userCreds.binotelSecret;

  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;
  const payload = { key: bKey, secret: bSecret, startPeriod: dayAgo, stopPeriod: now };

  const probe = async (url: string, body: Record<string, unknown>) => {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const ct = r.headers.get("content-type") ?? "";
      const text = await r.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { /* not json */ }
      return { status: r.status, contentType: ct, json, text: json ? undefined : text.slice(0, 300) };
    } catch (e) {
      return { error: String(e) };
    }
  };

  const results = await Promise.all([
    probe("https://api.binotel.com/api/4.0/stats/general-calls-for-period.json", payload),
    probe("https://api.binotel.com/api/3.0/stats/general-calls-for-period.json", payload),
    probe("https://api.binotel.com/api/4.0/stats/call-record-link.json", { key: bKey, secret: bSecret, generalCallID: 1 }),
    probe("https://api.binotel.com/api/4.0/stats/call-record.json", { key: bKey, secret: bSecret, generalCallID: 1 }),
    probe("https://api.binotel.com/api/4.0/company/get-balance.json", { key: bKey, secret: bSecret }),
  ]);

  return NextResponse.json({
    credentialsUsed: { bKeyLen: bKey.length, bSecretLen: bSecret.length },
    "v4/general-calls-for-period": results[0],
    "v3/general-calls-for-period": results[1],
    "v4/call-record-link": results[2],
    "v4/call-record": results[3],
    "v4/company/get-balance": results[4],
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
