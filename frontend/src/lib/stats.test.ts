import { describe, expect, it } from "vitest";
import { byTime, monthlyTotals, normalizeTexture, rollingMean } from "./stats";

describe("rollingMean", () => {
  it("averages a trailing window", () => {
    expect(rollingMean([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
  });

  it("skips nulls instead of counting them as 0", () => {
    expect(rollingMean([20, null, 22], 3)).toEqual([20, 20, 21]);
  });

  it("returns null when the whole window is null", () => {
    expect(rollingMean([null, null, 5], 2)).toEqual([null, null, 5]);
  });
});

describe("monthlyTotals", () => {
  it("sums per month and treats null as 0", () => {
    const rows = [
      { month: 1, v: 2 },
      { month: 1, v: 3 },
      { month: 12, v: null },
      { month: 12, v: 4 },
    ];
    const totals = monthlyTotals(rows, (r) => r.v);
    expect(totals).toHaveLength(12);
    expect(totals[0]).toBe(5);
    expect(totals[11]).toBe(4);
    expect(totals[5]).toBe(0);
  });
});

describe("normalizeTexture", () => {
  it("rescales clay/silt/sand to 100 %", () => {
    const t = normalizeTexture(43.5, 28.5, 27.9)!;
    expect(t.clay + t.silt + t.sand).toBeCloseTo(100);
    expect(t.clay).toBeCloseTo((43.5 / 99.9) * 100);
  });

  it("returns null when there is no data", () => {
    expect(normalizeTexture(null, null, null)).toBeNull();
  });
});

describe("byTime", () => {
  it("sorts ISO dates chronologically", () => {
    const rows = [{ time: "2025-02-01" }, { time: "2025-01-15" }];
    expect(rows.sort(byTime).map((r) => r.time)).toEqual(["2025-01-15", "2025-02-01"]);
  });
});
