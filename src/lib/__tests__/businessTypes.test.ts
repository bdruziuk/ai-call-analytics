import { describe, it, expect } from "vitest";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  isValidBusinessType,
} from "@/lib/businessTypes";

describe("BUSINESS_TYPES", () => {
  it("contains exactly 11 values", () => {
    expect(BUSINESS_TYPES.length).toBe(11);
  });

  it("always includes 'other'", () => {
    expect(BUSINESS_TYPES).toContain("other");
  });
});

describe("isValidBusinessType", () => {
  it("returns true for every declared type", () => {
    for (const bt of BUSINESS_TYPES) {
      expect(isValidBusinessType(bt)).toBe(true);
    }
  });

  it("returns false for unknown strings", () => {
    expect(isValidBusinessType("hotel")).toBe(false);
    expect(isValidBusinessType("")).toBe(false);
    expect(isValidBusinessType("PIZZERIA")).toBe(false); // case-sensitive
  });

  it("returns false for non-string values", () => {
    expect(isValidBusinessType(null)).toBe(false);
    expect(isValidBusinessType(undefined)).toBe(false);
    expect(isValidBusinessType(42)).toBe(false);
  });
});

describe("BUSINESS_TYPE_LABELS", () => {
  it("has a label for every declared type", () => {
    for (const bt of BUSINESS_TYPES) {
      expect(BUSINESS_TYPE_LABELS[bt]).toBeTruthy();
    }
  });

  it("all labels are non-empty strings", () => {
    for (const label of Object.values(BUSINESS_TYPE_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("has no extra keys beyond declared types", () => {
    const keys = Object.keys(BUSINESS_TYPE_LABELS);
    expect(keys.length).toBe(BUSINESS_TYPES.length);
    for (const key of keys) {
      expect(isValidBusinessType(key)).toBe(true);
    }
  });
});
