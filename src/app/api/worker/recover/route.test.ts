// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, enqueueCall } = vi.hoisted(() => ({
  db:          { call: { updateMany: vi.fn(), findMany: vi.fn() } },
  enqueueCall: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/services/call.service", () => ({ enqueueCall }));

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "s3cret";
  db.call.updateMany.mockResolvedValue({ count: 0 });
  db.call.findMany.mockResolvedValue([]);
});

describe("POST /api/worker/recover", () => {
  it("excludes calls of suspended accounts from re-enqueueing", async () => {
    const res = await POST(new Request("http://x/api/worker/recover", {
      method: "POST",
      headers: { "x-cron-secret": "s3cret" },
    }));

    expect(res.status).toBe(200);
    const where = db.call.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("queued");
    expect(where.OR).toEqual([{ userId: null }, { user: { suspendedAt: null } }]);
  });
});
