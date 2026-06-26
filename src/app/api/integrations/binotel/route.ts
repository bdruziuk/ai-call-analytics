import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";

/**
 * Fetch the direct MP3 download URL from Binotel's REST API.
 * Requires BINOTEL_KEY and BINOTEL_SECRET env vars.
 * Docs: https://api.binotel.ua/api/4.0/calls/call-records
 */
async function getBinotelRecordingUrl(generalCallID: string): Promise<string | null> {
  const key    = process.env.BINOTEL_KEY;
  const secret = process.env.BINOTEL_SECRET;
  if (!key || !secret) return null;

  const res = await fetch("https://api.binotel.ua/api/4.0/calls/call-records.json", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ key, secret, generalCallID }),
  });

  if (!res.ok) {
    console.error("[binotel] call-records API error:", res.status, await res.text());
    return null;
  }

  const data = await res.json() as Record<string, unknown>;
  console.log("[binotel] call-records API response:", JSON.stringify(data));

  // Response shape: { data: { generatedFileLink: "https://..." } }
  const link = (data?.data as Record<string, unknown>)?.generatedFileLink
    ?? (data?.data as Record<string, unknown>)?.fileLink
    ?? data?.generatedFileLink
    ?? null;

  return link ? String(link) : null;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
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

  // Binotel sends flat bracket-notation keys: callDetails[disposition], callDetails[generalCallID], etc.
  const disposition = String(
    body["callDetails[disposition]"] ?? body.disposition ?? ""
  ).toUpperCase();

  if (disposition && disposition !== "ANSWER" && disposition !== "ANSWERED") {
    logApiRequest(auth.userId, "binotel", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `call disposition is ${disposition}` });
  }

  const generalCallID = String(body["callDetails[generalCallID]"] ?? body["callDetails[callID]"] ?? "");
  const recordingStatus = String(body["callDetails[recordingStatus]"] ?? "").toLowerCase();

  // Try to get the direct recording URL from Binotel's API using generalCallID
  let recordingUrl = "";

  if (generalCallID && (process.env.BINOTEL_KEY || process.env.BINOTEL_SECRET)) {
    const apiUrl = await getBinotelRecordingUrl(generalCallID);
    if (apiUrl) {
      recordingUrl = apiUrl;
    } else if (recordingStatus === "uploading") {
      // Recording not ready yet — tell Binotel to retry
      logApiRequest(auth.userId, "binotel", "skipped", 503);
      return NextResponse.json({ error: "recording not ready, please retry" }, { status: 503 });
    }
  }

  // Fallback: use URL fields from the payload (including portal link as last resort)
  if (!recordingUrl) {
    recordingUrl = String(
      body["callDetails[file]"] ??
      body["callDetails[record_url]"] ??
      body["callDetails[linkToCallRecordInMyBusiness]"] ??
      body.file ?? body.file_url ?? body.record_url ?? body.recording_url ?? ""
    );
  }

  // If still uploading and no usable URL, ask Binotel to retry
  if (!recordingUrl && recordingStatus === "uploading") {
    logApiRequest(auth.userId, "binotel", "skipped", 503);
    return NextResponse.json({ error: "recording not ready, please retry" }, { status: 503 });
  }

  if (!recordingUrl) {
    logApiRequest(auth.userId, "binotel", "no_recording", 400);
    return NextResponse.json({ error: "No recording URL in payload" }, { status: 400 });
  }

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "binotel" });
    logApiRequest(auth.userId, "binotel", "success", 200);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/binotel]", err);
    logApiRequest(auth.userId, "binotel", "error", 502);
    if (err instanceof Error && err.message.startsWith("HTTP_CONTENT")) {
      // Got HTML/redirect instead of audio — recording not ready yet, ask Binotel to retry
      logApiRequest(auth.userId, "binotel", "skipped", 503);
      return NextResponse.json({ error: "recording not ready, please retry" }, { status: 503 });
    }
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
