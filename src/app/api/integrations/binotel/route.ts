import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";

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

  const requestType    = String(body.requestType ?? "");
  const recordingStatus = String(body["callDetails[recordingStatus]"] ?? "").toLowerCase();
  const disposition    = String(body["callDetails[disposition]"] ?? body.disposition ?? "").toUpperCase();

  // Skip non-answered calls
  if (disposition && disposition !== "ANSWER" && disposition !== "ANSWERED") {
    logApiRequest(auth.userId, "binotel", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `call disposition is ${disposition}` });
  }

  // apiCallCompleted fires immediately when the call ends — recording may still be uploading.
  // Binotel sends a separate apiCallRecordCompleted event once the file is ready.
  // Skip the first event; handle the second one below.
  if (requestType === "apiCallCompleted" && recordingStatus === "uploading") {
    logApiRequest(auth.userId, "binotel", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: "waiting for apiCallRecordCompleted" });
  }

  // Extract recording URL — apiCallRecordCompleted should include a direct file link
  const recordingUrl = String(
    body["callDetails[file]"] ??
    body["callDetails[record_url]"] ??
    body["callDetails[recording_url]"] ??
    body["callDetails[generatedFileLink]"] ??
    body["callDetails[fileLink]"] ??
    body.file ?? body.file_url ?? body.record_url ?? body.recording_url ?? ""
  );

  console.log("[binotel] requestType:", requestType, "recordingStatus:", recordingStatus, "recordingUrl:", recordingUrl, "body:", JSON.stringify(body));

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
