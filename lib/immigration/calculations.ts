import type { ComparisonResult } from "./types";

export function calculateMoM(
  current: number,
  prev: number | undefined | null
): ComparisonResult {
  if (prev === undefined || prev === null) {
    return { delta: null, rate: null };
  }
  const delta = current - prev;
  const rate = prev === 0 ? null : (delta / prev) * 100;
  return { delta, rate };
}

export function calculateYoY(
  current: number,
  lastYearSameMonth: number | undefined | null
): ComparisonResult {
  if (lastYearSameMonth === undefined || lastYearSameMonth === null) {
    return { delta: null, rate: null };
  }
  const delta = current - lastYearSameMonth;
  const rate =
    lastYearSameMonth === 0 ? null : (delta / lastYearSameMonth) * 100;
  return { delta, rate };
}

export function getMetricValue(
  stat: Record<string, number>,
  key: string
): number {
  return stat[key] ?? 0;
}
