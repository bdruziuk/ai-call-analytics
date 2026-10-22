// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, transcribe, detectCallLanguage, analyzeCall, unlink } = vi.hoisted(() => ({
  db: {
    call: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  transcribe:         vi.fn(),
  detectCallLanguage: vi.fn(),
  analyzeCall:        vi.fn(),
  unlink:             vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/openai", () => ({
  openai: { audio: { transcriptions: { create: transcribe } } },
}));

vi.mock("@/lib/analysis/detectLanguage", () => ({ detectCallLanguage }));

vi.mock("@/lib/analyzeCall", () => ({ analyzeCall }));

vi.mock("@/lib/planLimits", () => ({ incrementMinutesUsed: vi.fn() }));
vi.mock("music-metadata", () => ({ parseFile: vi.fn().mockRejectedValue(new Error("no meta")) }));

vi.mock("fs/promises", () => ({
  access: vi.fn().mockResolvedValue(undefined),
  unlink: (...args: unknown[]) => unlink(...args),
}));
vi.mock("fs", () => ({ default: { createReadStream: vi.fn(() => "stream") } }));

import { processCall } from "@/services/call.service";

const queuedCall = { id: "c1", userId: "u1", status: "queued", filePath: "/tmp/a.mp3", reportType: "medium" };

beforeEach(() => {
  vi.clearAllMocks();
  db.call.findUnique.mockResolvedValue(queuedCall);
  db.call.update.mockImplementation(({ data }) => Promise.resolve({ ...queuedCall, ...data }));
});

describe("processCall for a suspended account", () => {
  it("does not call OpenAI and leaves the call queued with its audio", async () => {
    db.user.findUnique.mockResolvedValue({ suspendedAt: new Date() });

    const result = await processCall("c1");

    expect(result.status).toBe("queued");
    expect(transcribe).not.toHaveBeenCalled();
    expect(db.call.update).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
  });

  it("stops before analysis when suspended during transcription", async () => {
    db.user.findUnique
      .mockResolvedValueOnce({ suspendedAt: null })        // check before transcription
      .mockResolvedValueOnce({ suspendedAt: new Date() }); // check after transcription
    transcribe.mockResolvedValue({ text: "hello" });

    const result = await processCall("c1");

    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(detectCallLanguage).not.toHaveBeenCalled();
    expect(analyzeCall).not.toHaveBeenCalled();
    expect(result.status).toBe("queued");
    expect(unlink).not.toHaveBeenCalled();
  });

  it("processes normally when the account is active", async () => {
    db.user.findUnique.mockResolvedValue({ suspendedAt: null, businessType: "other" });
    transcribe.mockResolvedValue({ text: "hello" });
    detectCallLanguage.mockResolvedValue({ detected: "uk", languageName: "Ukrainian" });
    analyzeCall.mockResolvedValue({ summary: "ok" });

    const result = await processCall("c1");

    expect(analyzeCall).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("completed");
    expect(unlink).toHaveBeenCalledWith("/tmp/a.mp3");
  });
});
