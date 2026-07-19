import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("@/lib/openai", () => ({
  openai: { chat: { completions: { create: (...args: unknown[]) => createMock(...args) } } },
}));

import { normalizeDemandTags } from "@/lib/normalizeDemandTags";

function mkCounts(entries: [string, number][]) {
  return new Map(entries);
}

describe("normalizeDemandTags", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns the single tag unchanged without calling AI", async () => {
    const result = await normalizeDemandTags(mkCounts([["доставка додому", 5]]));
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual([{ tag: "доставка додому", count: 5, weight: 5 }]);
  });

  it("merges case/whitespace-only duplicates without calling AI", async () => {
    const result = await normalizeDemandTags(
      mkCounts([
        ["Доставка додому", 3],
        ["доставка додому", 2],
        ["ДОСТАВКА ДОДОМУ ", 1],
      ]),
    );
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual([{ tag: "Доставка додому", count: 6, weight: 5 }]);
  });

  it("merges cross-language duplicates using the AI grouping response and recomputes weight", async () => {
    createMock.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            groups: [
              { canonicalName: "Доставка додому", members: ["Доставка додому", "Доставка на дом", "Home delivery"] },
              { canonicalName: "Знижки", members: ["Знижки"] },
            ],
          }),
        },
      }],
    });

    const result = await normalizeDemandTags(
      mkCounts([
        ["Доставка додому", 4],
        ["Доставка на дом", 3],
        ["Home delivery", 2],
        ["Знижки", 9],
      ]),
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    // Highest count (9 → Знижки) sets weight=5; merged delivery tag (4+3+2=9) also =5
    expect(result).toEqual([
      { tag: "Доставка додому", count: 9, weight: 5 },
      { tag: "Знижки", count: 9, weight: 5 },
    ]);
  });

  it("falls back to the ungrouped list when the AI call fails", async () => {
    createMock.mockRejectedValue(new Error("network error"));
    const result = await normalizeDemandTags(
      mkCounts([
        ["Доставка додому", 4],
        ["Home delivery", 2],
      ]),
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.tag).sort()).toEqual(["Доставка додому", "Home delivery"].sort());
  });

  it("respects the limit after merging", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ groups: [] }) } }] });
    const counts = mkCounts(Array.from({ length: 25 }, (_, i) => [`tag-${i}`, 25 - i] as [string, number]));
    const result = await normalizeDemandTags(counts, 20);
    expect(result).toHaveLength(20);
    expect(result[0].tag).toBe("tag-0");
  });
});
