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
