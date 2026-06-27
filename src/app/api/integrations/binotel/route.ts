import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";
import { db } from "@/lib/db";

async function getBinotelRecordingUrl(
  bKey: string,
  bSecret: string,
  generalCallID: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://api.binotel.com/api/4.0/stats/call-record-link.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: bKey, secret: bSecret, generalCallID }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    // Binotel returns { status: "success", recordLink: "https://..." }
    return typeof data.recordLink === "string" ? data.recordLink : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  // Load Binotel credentials stored in the user profile
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

  // Skip non-answered calls
  if (disposition && disposition !== "ANSWER" && disposition !== "ANSWERED") {
    logApiRequest(auth.userId, "binotel", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `call disposition is ${disposition}` });
  }

  // Binotel retries apiCallCompleted until recordingStatus changes from "uploading" to "uploaded".
  // Return 503 while uploading so Binotel keeps retrying.
  if (recordingStatus === "uploading") {
    logApiRequest(auth.userId, "binotel", "skipped", 503);
    return NextResponse.json({ error: "recording still uploading, please retry" }, { status: 503 });
  }

  // Resolve the recording URL via Binotel API (preferred — returns a signed, directly downloadable link).
  // If credentials exist but the API call fails, return 503 so Binotel retries rather than
  // falling back to portal URLs that require a browser session and return an HTML login page.
  let recordingUrl = "";

  if (bKey && bSecret) {
    if (!generalCallID) {
      console.warn("[binotel] bKey/bSecret set but generalCallID missing from payload. Body keys:", Object.keys(body));
      logApiRequest(auth.userId, "binotel", "skipped", 503);
      return NextResponse.json({ error: "generalCallID missing, please retry" }, { status: 503 });
    }
    const apiUrl = await getBinotelRecordingUrl(bKey, bSecret, generalCallID);
    if (apiUrl) {
      recordingUrl = apiUrl;
      console.log("[binotel] resolved via API:", recordingUrl);
    } else {
      // API call failed — portal fallback URLs require auth and return HTML, so retry instead.
      console.warn("[binotel] API returned no recordLink for generalCallID:", generalCallID, "— returning 503 for retry");
      logApiRequest(auth.userId, "binotel", "skipped", 503);
      return NextResponse.json({ error: "recording link not available yet, please retry" }, { status: 503 });
    }
  } else {
    // No credentials — attempt portal URLs from the webhook body (may require auth).
    recordingUrl = String(
      body["callDetails[file]"] ??
      body["callDetails[record_url]"] ??
      body["callDetails[recording_url]"] ??
      body["callDetails[generatedFileLink]"] ??
      body["callDetails[fileLink]"] ??
      body["callDetails[linkToCallRecordInMyBusiness]"] ??
      body.file ?? body.file_url ?? body.record_url ?? body.recording_url ?? ""
    );
  }

  console.log("[binotel] requestType:", requestType, "recordingStatus:", recordingStatus, "generalCallID:", generalCallID, "recordingUrl:", recordingUrl);

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
