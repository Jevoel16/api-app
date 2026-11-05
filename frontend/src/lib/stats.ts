/** Trailing rolling mean that ignores nulls; null where the window has no values. */
export function rollingMean(values: (number | null)[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const nums = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v !== null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  });
}

/** Sum a value per calendar month (index 0 = January), treating null as 0. */
export function monthlyTotals<T extends { month: number }>(rows: T[], value: (row: T) => number | null): number[] {
  const totals = Array<number>(12).fill(0);
  for (const row of rows) totals[row.month - 1] += value(row) ?? 0;
  return totals;
}

export type Texture = { clay: number; silt: number; sand: number };

/** Clay/silt/sand rescaled to sum to 100 %, or null when there is no data. */
export function normalizeTexture(clay: number | null, silt: number | null, sand: number | null): Texture | null {
  const total = (clay ?? 0) + (silt ?? 0) + (sand ?? 0);
  if (total === 0) return null;
  return {
    clay: ((clay ?? 0) / total) * 100,
    silt: ((silt ?? 0) / total) * 100,
    sand: ((sand ?? 0) / total) * 100,
  };
}

export function byTime<T extends { time: string }>(a: T, b: T): number {
  return a.time.localeCompare(b.time);
}
