import { describe, it, expect } from "vitest";
import { getAnalysisPrompt, REPORT_TYPES, type ReportType, type AnalysisLanguage } from "@/lib/analysis/prompts";

const LANGUAGES: AnalysisLanguage[] = ["uk", "ru", "en", "uk_ru"];

describe("getAnalysisPrompt", () => {
  it("returns a non-empty string for all report type / language combinations", () => {
    for (const reportType of REPORT_TYPES) {
      for (const lang of LANGUAGES) {
        const prompt = getAnalysisPrompt(reportType, lang);
        expect(typeof prompt).toBe("string");
        expect(prompt.length).toBeGreaterThan(100);
      }
    }
  });

  it("always includes the saleStatus enum values in the output", () => {
    for (const lang of LANGUAGES) {
      const prompt = getAnalysisPrompt("medium", lang);
      expect(prompt).toContain("sold");
      expect(prompt).toContain("not_sold");
      expect(prompt).toContain("potential_sale");
      expect(prompt).toContain("junk");
    }
  });

  it("includes JSON schema instruction", () => {
    const prompt = getAnalysisPrompt("high_level", "uk");
    expect(prompt.toLowerCase()).toMatch(/json/);
  });

  it("injects industryData block for non-other business types", () => {
    const withIndustry  = getAnalysisPrompt("medium", "uk", "pizzeria");
    const withoutIndustry = getAnalysisPrompt("medium", "uk", "other");
    expect(withIndustry).toContain("industryData");
    expect(withoutIndustry).not.toContain("industryData");
  });

  it("detailed report contains more content than high_level", () => {
    const detailed   = getAnalysisPrompt("detailed",   "uk");
    const high_level = getAnalysisPrompt("high_level", "uk");
    expect(detailed.length).toBeGreaterThan(high_level.length);
  });
});

describe("REPORT_TYPES", () => {
  it("contains exactly 3 values", () => {
    expect(REPORT_TYPES).toHaveLength(3);
  });

  it("contains expected values", () => {
    expect(REPORT_TYPES).toContain("high_level");
    expect(REPORT_TYPES).toContain("medium");
    expect(REPORT_TYPES).toContain("detailed");
  });
});
