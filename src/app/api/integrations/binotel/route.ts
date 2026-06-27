import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";
import { db } from "@/lib/db";

// Binotel's portal recording URL requires auth. Fetch it with HTTP Basic Auth (key:secret),
// following redirects. If Binotel redirects to a public CDN/signed URL, return that URL so
// downloadAndQueueRecording can fetch it directly (without auth). Returns null if no redirect
// or if the response is HTML (auth failed or recording not ready).
async function resolveBinotelRedirect(
  bKey: string,
  bSecret: string,
  portalUrl: string,
): Promise<string | null> {
  if (!portalUrl) return null;
  const credentials = Buffer.from(`${bKey}:${bSecret}`).toString("base64");
  try {
    const res = await fetch(portalUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${credentials}` },
      redirect: "follow",
    });
    const contentType = res.headers.get("content-type") ?? "";
    console.log("[binotel] portal auth fetch status:", res.status, "content-type:", contentType, "final-url:", res.url);
    if (!res.ok || contentType.includes("text/html")) return null;
    // Only useful if it redirected to a different (public) URL
    if (res.url && res.url !== portalUrl) return res.url;
    // No redirect — audio served directly with auth; we can't proxy it this way
    console.warn("[binotel] portal returned audio directly (no redirect); cannot re-fetch without auth");
    return null;
  } catch (err) {
    console.error("[binotel] portal auth fetch error:", err);
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

  // Extract portal URL from webhook body (always available regardless of credentials)
  const portalUrl = String(
    body["callDetails[file]"] ??
    body["callDetails[record_url]"] ??
    body["callDetails[recording_url]"] ??
    body["callDetails[generatedFileLink]"] ??
    body["callDetails[fileLink]"] ??
    body["callDetails[linkToCallRecordInMyBusiness]"] ??
    body.file ?? body.file_url ?? body.record_url ?? body.recording_url ?? body.recordingUrl ?? ""
  );

  if (bKey && bSecret) {
    if (!portalUrl) {
      console.warn("[binotel] bKey/bSecret set but no recording URL in payload. Body keys:", Object.keys(body));
      logApiRequest(auth.userId, "binotel", "skipped", 503);
      return NextResponse.json({ error: "recording URL missing, please retry" }, { status: 503 });
    }
    // Try downloading the portal URL with HTTP Basic Auth (key:secret)
    const authUrl = await resolveBinotelRedirect(bKey, bSecret, portalUrl);
    if (authUrl) {
      recordingUrl = authUrl;
      console.log("[binotel] resolved via Basic Auth:", recordingUrl);
    } else {
      console.warn("[binotel] could not resolve public URL for generalCallID:", generalCallID, "— returning 503 for retry");
      logApiRequest(auth.userId, "binotel", "skipped", 503);
      return NextResponse.json({ error: "recording link not available yet, please retry" }, { status: 503 });
    }
  } else {
    // No credentials — attempt portal URL directly (will fail if auth required)
    recordingUrl = portalUrl;
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
