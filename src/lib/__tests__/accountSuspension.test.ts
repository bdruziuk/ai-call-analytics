// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, apiLogCreate } = vi.hoisted(() => ({
  findUnique:   vi.fn(),
  apiLogCreate: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique }, apiLog: { create: apiLogCreate } },
}));

import { isUserSuspended, rejectIfSuspended } from "@/lib/accountSuspension";

beforeEach(() => vi.clearAllMocks());

describe("isUserSuspended", () => {
  it("is true when suspendedAt is set", async () => {
    findUnique.mockResolvedValue({ suspendedAt: new Date() });
    expect(await isUserSuspended("u1")).toBe(true);
  });

  it("is false when suspendedAt is null or the user is missing", async () => {
    findUnique.mockResolvedValueOnce({ suspendedAt: null });
    expect(await isUserSuspended("u1")).toBe(false);
    findUnique.mockResolvedValueOnce(null);
    expect(await isUserSuspended("u1")).toBe(false);
  });
});

describe("rejectIfSuspended", () => {
  it("returns null for an active account", async () => {
    findUnique.mockResolvedValue({ suspendedAt: null });
    expect(await rejectIfSuspended("u1", "twilio")).toBeNull();
    expect(apiLogCreate).not.toHaveBeenCalled();
  });

  it("returns 403 account_suspended and logs the webhook rejection", async () => {
    findUnique.mockResolvedValue({ suspendedAt: new Date() });
    const res = await rejectIfSuspended("u1", "twilio");
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "account_suspended" });
    expect(apiLogCreate).toHaveBeenCalledWith({
      data: { userId: "u1", endpoint: "twilio", status: "suspended", statusCode: 403 },
    });
  });
});
