import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";
import { db } from "@/lib/db";

const RECORDING_FIELDS = [
  "callDetails[file]",
  "callDetails[record_url]",
  "callDetails[recording_url]",
  "callDetails[recordingUrl]",
  "callDetails[generatedFileLink]",
  "callDetails[fileLink]",
  "callDetails[linkToCallRecordInMyBusiness]",
  "file",
  "file_url",
  "record_url",
  "recording_url",
  "recordingUrl",
];

// Try fetching a URL, optionally with key/secret as query params.
// Returns the final URL if the response is non-HTML audio, null otherwise.
async function tryFetch(url: string, bKey?: string, bSecret?: string): Promise<string | null> {
  try {
    let fetchUrl = url;
    if (bKey && bSecret) {
      const u = new URL(url);
      u.searchParams.set("key", bKey);
      u.searchParams.set("secret", bSecret);
      fetchUrl = u.toString();
    }
    const res = await fetch(fetchUrl, { redirect: "follow" });
    const ct = res.headers.get("content-type") ?? "";
    console.log(`[binotel] tryFetch${bKey ? "(+creds)" : ""} status:${res.status} ct:${ct} url:${fetchUrl.slice(0, 120)} final:${res.url.slice(0, 120)}`);
    if (!res.ok || ct.includes("text/html")) return null;
    // If redirected, return the public CDN URL; otherwise the authenticated URL itself
    return res.url || fetchUrl;
  } catch (err) {
    console.error("[binotel] tryFetch error:", err);
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

  // Log full body for diagnostics
  console.log("[binotel] BODY:", JSON.stringify(body));

  const requestType     = String(body.requestType ?? "");
  const recordingStatus = String(body["callDetails[recordingStatus]"] ?? "").toLowerCase();
  const disposition     = String(body["callDetails[disposition]"] ?? body.disposition ?? "").toUpperCase();
  const generalCallID   = String(body["callDetails[generalCallID]"] ?? body.generalCallID ?? "");

  if (disposition && disposition !== "ANSWER" && disposition !== "ANSWERED") {
    logApiRequest(auth.userId, "binotel", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `call disposition is ${disposition}` });
  }

  if (recordingStatus === "uploading") {
    logApiRequest(auth.userId, "binotel", "skipped", 503);
    return NextResponse.json({ error: "recording still uploading, please retry" }, { status: 503 });
  }

  // Collect all non-empty URL candidates from the body
  const urlCandidates: string[] = [];
  for (const field of RECORDING_FIELDS) {
    const val = String(body[field] ?? "").trim();
    if (val && !urlCandidates.includes(val)) urlCandidates.push(val);
  }
  console.log("[binotel] requestType:", requestType, "recordingStatus:", recordingStatus, "generalCallID:", generalCallID, "urlCandidates:", urlCandidates);

  if (!urlCandidates.length) {
    logApiRequest(auth.userId, "binotel", "no_recording", 400);
    return NextResponse.json({ error: "No recording URL in payload" }, { status: 400 });
  }

  // Try each candidate URL — with credentials first, then without
  let recordingUrl = "";
  for (const candidate of urlCandidates) {
    if (bKey && bSecret) {
      const result = await tryFetch(candidate, bKey, bSecret);
      if (result) { recordingUrl = result; break; }
    }
    const result = await tryFetch(candidate);
    if (result) { recordingUrl = result; break; }
  }

  if (!recordingUrl) {
    console.warn("[binotel] all URL attempts failed for generalCallID:", generalCallID, "— returning 503 for retry");
    logApiRequest(auth.userId, "binotel", "skipped", 503);
    return NextResponse.json({ error: "recording link not available yet, please retry" }, { status: 503 });
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
