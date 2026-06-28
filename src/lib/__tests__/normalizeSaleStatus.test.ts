import { describe, it, expect } from "vitest";
import { normalizeSaleStatus } from "@/lib/analysis/saleStatus";

describe("normalizeSaleStatus", () => {
  it("recognises exact enum values unchanged", () => {
    expect(normalizeSaleStatus("sold")).toBe("sold");
    expect(normalizeSaleStatus("not_sold")).toBe("not_sold");
    expect(normalizeSaleStatus("potential_sale")).toBe("potential_sale");
    expect(normalizeSaleStatus("junk")).toBe("junk");
  });

  it("handles 'junk' variants", () => {
    expect(normalizeSaleStatus("JUNK")).toBe("junk");
    expect(normalizeSaleStatus("it's junk call")).toBe("junk");
    expect(normalizeSaleStatus("junk_call")).toBe("junk");
  });

  it("handles 'sold' without 'not'", () => {
    expect(normalizeSaleStatus("SOLD")).toBe("sold");
    expect(normalizeSaleStatus("product_sold")).toBe("sold");
  });

  it("handles 'not_sold' variants", () => {
    expect(normalizeSaleStatus("not sold")).toBe("not_sold");
    expect(normalizeSaleStatus("NOT_SOLD")).toBe("not_sold");
    expect(normalizeSaleStatus("not-sold")).toBe("not_sold");
  });

  it("handles 'potential' variants", () => {
    expect(normalizeSaleStatus("potential")).toBe("potential_sale");
    expect(normalizeSaleStatus("POTENTIAL_SALE")).toBe("potential_sale");
    expect(normalizeSaleStatus("potential sale")).toBe("potential_sale");
  });

  it("falls back to 'not_sold' for unrecognised values", () => {
    expect(normalizeSaleStatus("unknown")).toBe("not_sold");
    expect(normalizeSaleStatus("")).toBe("not_sold");
    expect(normalizeSaleStatus(123)).toBe("not_sold");
  });

  it("'junk' takes priority over 'sold' when both appear", () => {
    expect(normalizeSaleStatus("junk sold")).toBe("junk");
  });
});

describe("junk score nulling (contract)", () => {
  // The analyzeCall function sets score=null when saleStatus==='junk'.
  // We can't call analyzeCall directly (requires OpenAI), but we verify the
  // normalizeSaleStatus side — that "junk" is correctly identified before nulling.
  it("normalizeSaleStatus returns 'junk' for all junk variants", () => {
    const junkInputs = ["junk", "JUNK", "it's a junk call", "junk_call", "junk lead"];
    for (const input of junkInputs) {
      expect(normalizeSaleStatus(input)).toBe("junk");
    }
  });

  it("non-junk statuses are never mapped to junk", () => {
    const nonJunk = ["sold", "not_sold", "potential_sale", "unknown", ""];
    for (const input of nonJunk) {
      expect(normalizeSaleStatus(input)).not.toBe("junk");
    }
  });
});
