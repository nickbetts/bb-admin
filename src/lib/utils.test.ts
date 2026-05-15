import {
  buildCrossContextString,
  cn,
  computeHealthScore,
  formatCurrency,
  formatNumber,
  pctChange,
} from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("utils", () => {
  it("merges utility classes correctly", () => {
    expect(cn("p-2", "p-4", "text-sm")).toBe("p-4 text-sm");
  });

  it("formats large numbers with suffixes", () => {
    expect(formatNumber(1530)).toBe("1.5K");
    expect(formatNumber(2_600_000)).toBe("2.6M");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats GBP currency", () => {
    expect(formatCurrency(1250)).toBe("£1,250");
  });

  it("computes percentage changes safely", () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(100, 0)).toBeUndefined();
  });

  it("builds cross-platform context excluding the current platform", () => {
    const context = buildCrossContextString(
      [
        { platform: "GA4", metrics: { users: 1200 } },
        { platform: "Meta", metrics: { spend: 3500, ctr: "2.4%" } },
      ],
      "GA4",
    );

    expect(context).toContain("Meta:");
    expect(context).not.toContain("GA4:");
  });

  it("caps health score at a minimum of zero", () => {
    const alerts = Array.from({ length: 20 }, () => ({ severity: "high" as const }));
    expect(computeHealthScore(alerts)).toBe(0);
  });
});
