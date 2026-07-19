import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("@/lib/openai", () => ({
  openai: { chat: { completions: { create: (...args: unknown[]) => createMock(...args) } } },
}));

import { normalizeTopProducts } from "@/lib/normalizeTopProducts";

function mkCounts(entries: [string, number, number][]) {
  return new Map(entries.map(([product, total, sold]) => [product, { total, sold }]));
}

describe("normalizeTopProducts", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns the single product unchanged without calling AI", async () => {
    const result = await normalizeTopProducts(mkCounts([["Піца Маргарита", 5, 2]]));
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual([{ product: "Піца Маргарита", callCount: 5, soldCount: 2, conversionRate: 40 }]);
  });

  it("merges case/whitespace-only duplicates without calling AI", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ groups: [] }) } }] });
    const result = await normalizeTopProducts(
      mkCounts([
        ["Піца Маргарита", 3, 1],
        ["піца маргарита", 2, 1],
        ["ПІЦА МАРГАРИТА ", 1, 1],
      ]),
    );
    // Pass-1 dedup already collapses these to one entry, so AI grouping of a
    // single distinct name is skipped entirely.
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual([{ product: "Піца Маргарита", callCount: 6, soldCount: 3, conversionRate: 50 }]);
  });

  it("merges cross-language duplicates using the AI grouping response", async () => {
    createMock.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            groups: [
              { canonicalName: "Піца Маргарита", members: ["Піца Маргарита", "Пицца Маргарита", "Pizza Margherita"] },
              { canonicalName: "Чізбургер", members: ["Чізбургер"] },
            ],
          }),
        },
      }],
    });

    const result = await normalizeTopProducts(
      mkCounts([
        ["Піца Маргарита", 4, 2],
        ["Пицца Маргарита", 3, 1],
        ["Pizza Margherita", 2, 1],
        ["Чізбургер", 5, 3],
      ]),
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      { product: "Піца Маргарита", callCount: 9, soldCount: 4, conversionRate: 44 },
      { product: "Чізбургер", callCount: 5, soldCount: 3, conversionRate: 60 },
    ]);
  });

  it("falls back to the ungrouped list when the AI call fails", async () => {
    createMock.mockRejectedValue(new Error("network error"));
    const result = await normalizeTopProducts(
      mkCounts([
        ["Піца Маргарита", 4, 2],
        ["Pizza Margherita", 2, 1],
      ]),
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.product).sort()).toEqual(["Pizza Margherita", "Піца Маргарита"].sort());
  });

  it("falls back to the ungrouped list when OPENAI_API_KEY is unset", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await normalizeTopProducts(
      mkCounts([
        ["Піца Маргарита", 4, 2],
        ["Pizza Margherita", 2, 1],
      ]),
    );
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it("respects the limit after merging", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ groups: [] }) } }] });
    const counts = mkCounts(
      Array.from({ length: 5 }, (_, i) => [`Product ${i}`, 5 - i, 0] as [string, number, number]),
    );
    const result = await normalizeTopProducts(counts, 2);
    expect(result).toHaveLength(2);
    expect(result[0].product).toBe("Product 0");
    expect(result[1].product).toBe("Product 1");
  });
});
