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
    if (data.status === "success" && typeof data.url === "string" && data.url) return data.url;
    console.warn("[binotel] call-record returned no URL:", JSON.stringify(data).slice(0, 200));
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

  const recordingStatus  = String(body["callDetails[recordingStatus]"] ?? "").toLowerCase();
  const disposition      = String(body["callDetails[disposition]"] ?? body.disposition ?? "").toUpperCase();
  const generalCallID    = String(body["callDetails[generalCallID]"] ?? body.generalCallID ?? "");
  const internalNumber   = String(body["callDetails[internalNumber]"] ?? body.internalNumber ?? "") || undefined;

  console.log("[binotel] generalCallID:", generalCallID, "recordingStatus:", recordingStatus, "disposition:", disposition);

  if (disposition && disposition !== "ANSWER" && disposition !== "ANSWERED") {
    logApiRequest(auth.userId, "binotel", "cancelled", 200);
    return NextResponse.json({ skipped: true, reason: `call disposition is ${disposition}` });
  }

  if (!generalCallID) {
    logApiRequest(auth.userId, "binotel", "no_recording", 400);
    return NextResponse.json({ error: "No generalCallID in payload" }, { status: 400 });
  }

  // Auto-create SalesProfile for this internalNumber if not yet exists
  let salesProfileId: string | undefined;
  if (internalNumber) {
    const profile = await db.salesProfile.upsert({
      where: { userId_name: { userId: auth.userId, name: internalNumber } },
      update: {},
      create: { userId: auth.userId, name: internalNumber },
      select: { id: true },
    });
    salesProfileId = profile.id;
    console.log("[binotel] salesProfileId for", internalNumber, ":", salesProfileId);
  }

  // Check if this call was already successfully processed
  const existing = await db.call.findFirst({
    where: { userId: auth.userId, externalId: generalCallID },
    select: { id: true, status: true },
  });

  if (existing && existing.status !== "processing") {
    console.log("[binotel] generalCallID:", generalCallID, "already processed (status:", existing.status, ") — skipping");
    logApiRequest(auth.userId, "binotel", "duplicate", 200);
    return NextResponse.json({ skipped: true, reason: "already processed", callId: existing.id });
  }

  // Recording still uploading — upsert processing record and ask Binotel to retry
  if (recordingStatus === "uploading") {
    if (!existing) {
      try {
        await db.call.create({
          data: {
            userId: auth.userId,
            externalId: generalCallID,
            source: "binotel",
            status: "processing",
            reportType,
            fileName: `${generalCallID}.mp3`,
            filePath: "",
            internalNumber,
            salesProfileId,
          },
        });
        console.log("[binotel] generalCallID:", generalCallID, "— created processing record, waiting for upload");
      } catch (err) {
        // P2002: another concurrent request already created the placeholder — that's fine
        if ((err as { code?: string }).code !== "P2002") throw err;
        console.log("[binotel] generalCallID:", generalCallID, "— processing record already exists (race), skipping create");
      }
    } else {
      await db.call.update({
        where: { id: existing.id },
        data: { processingStartedAt: new Date() },
      });
      console.log("[binotel] generalCallID:", generalCallID, "— still uploading, updated processing record");
    }
    logApiRequest(auth.userId, "binotel", "uploading", 503);
    return NextResponse.json({ processing: true, generalCallID }, { status: 503 });
  }

  // Recording is ready — get signed S3 URL
  if (!bKey || !bSecret) {
    logApiRequest(auth.userId, "binotel", "no_recording", 400);
    return NextResponse.json({ error: "Binotel API credentials not configured" }, { status: 400 });
  }

  const s3Url = await getBinotelS3Url(bKey, bSecret, generalCallID);
  if (!s3Url) {
    console.warn("[binotel] generalCallID:", generalCallID, "— no S3 URL returned, retrying");
    logApiRequest(auth.userId, "binotel", "uploading", 503);
    return NextResponse.json({ error: "recording link not available yet, please retry" }, { status: 503 });
  }

  try {
    // Delete the processing placeholder BEFORE creating the real call record.
    // This frees the unique (userId, externalId) slot so downloadAndQueueRecording can use it.
    // If a concurrent request already deleted it, that's fine — we still proceed.
    if (existing) {
      try {
        await db.call.delete({ where: { id: existing.id } });
      } catch {
        // Already deleted by a concurrent request — that request owns the download; skip this one.
        logApiRequest(auth.userId, "binotel", "duplicate", 200);
        return NextResponse.json({ skipped: true, reason: "duplicate_in_progress" });
      }
    }

    const result = await downloadAndQueueRecording({ recordingUrl: s3Url, reportType, userId: auth.userId, prefix: "binotel", internalNumber, salesProfileId, externalId: generalCallID });

    if ("skipped" in result && result.skipped && result.reason === "duplicate") {
      logApiRequest(auth.userId, "binotel", "duplicate", 200);
      return NextResponse.json({ skipped: true, reason: "duplicate" });
    }

    logApiRequest(auth.userId, "binotel", "success", 200);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/binotel]", err);
    if (err instanceof Error && err.message.startsWith("HTTP_CONTENT")) {
      logApiRequest(auth.userId, "binotel", "uploading", 503);
      return NextResponse.json({ error: "recording not ready, please retry" }, { status: 503 });
    }
    logApiRequest(auth.userId, "binotel", "error", 502);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
