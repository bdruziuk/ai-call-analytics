import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";
import { db } from "@/lib/db";

async function getBinotelS3Url(bKey: string, bSecret: string, generalCallID: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.binotel.com/api/4.0/stats/call-record.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: bKey, secret: bSecret, generalCallID: Number(generalCallID) }),
    });
    const data = await res.json() as Record<string, unknown>;
    console.log("[binotel] call-record response:", JSON.stringify(data).slice(0, 300));
    if (data.status === "success" && typeof data.url === "string" && data.url) {
      return data.url;
    }
    return null;
  } catch (err) {
    console.error("[binotel] call-record API error:", err);
    return null;
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const userCreds = await db.user.findUnique({
    where: { id: auth.userId },
    select: { binotelKey: true, binotelSecret: true },
  });
  const bKey    = userCreds?.binotelKey    ?? "";
  const bSecret = userCreds?.binotelSecret ?? "";

  if (!VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number])) {
    logApiRequest(auth.userId, "binotel", "invalid_params", 400);
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });
  }

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
    logApiRequest(auth.userId, "binotel", "error", 400);
    return NextResponse.json({ error: "Failed to parse request body" }, { status: 400 });
  }

  const requestType     = String(body.requestType ?? "");
  const recordingStatus = String(body["callDetails[recordingStatus]"] ?? "").toLowerCase();
  const disposition     = String(body["callDetails[disposition]"] ?? body.disposition ?? "").toUpperCase();
  const generalCallID   = String(body["callDetails[generalCallID]"] ?? body.generalCallID ?? "");

  console.log("[binotel] requestType:", requestType, "recordingStatus:", recordingStatus, "generalCallID:", generalCallID, "disposition:", disposition);

  if (disposition && disposition !== "ANSWER" && disposition !== "ANSWERED") {
    logApiRequest(auth.userId, "binotel", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `call disposition is ${disposition}` });
  }

  if (recordingStatus === "uploading") {
    logApiRequest(auth.userId, "binotel", "skipped", 503);
    return NextResponse.json({ error: "recording still uploading, please retry" }, { status: 503 });
  }

  if (!generalCallID) {
    logApiRequest(auth.userId, "binotel", "no_recording", 400);
    return NextResponse.json({ error: "No generalCallID in payload" }, { status: 400 });
  }

  let recordingUrl = "";

  if (bKey && bSecret) {
    const s3Url = await getBinotelS3Url(bKey, bSecret, generalCallID);
    if (s3Url) {
      recordingUrl = s3Url;
    } else {
      console.warn("[binotel] call-record API returned no URL for generalCallID:", generalCallID, "— returning 503 for retry");
      logApiRequest(auth.userId, "binotel", "skipped", 503);
      return NextResponse.json({ error: "recording link not available yet, please retry" }, { status: 503 });
    }
  } else {
    // No credentials — try portal URL from webhook body (will likely fail without auth)
    recordingUrl = String(
      body["callDetails[linkToCallRecordInMyBusiness]"] ??
      body["callDetails[file]"] ?? body["callDetails[record_url]"] ?? ""
    );
  }

  if (!recordingUrl) {
    logApiRequest(auth.userId, "binotel", "no_recording", 400);
    return NextResponse.json({ error: "No recording URL" }, { status: 400 });
  }

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "binotel" });
    logApiRequest(auth.userId, "binotel", "success", 200);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/binotel]", err);
    if (err instanceof Error && err.message.startsWith("HTTP_CONTENT")) {
      logApiRequest(auth.userId, "binotel", "skipped", 503);
      return NextResponse.json({ error: "recording not ready, please retry" }, { status: 503 });
    }
    logApiRequest(auth.userId, "binotel", "error", 502);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
