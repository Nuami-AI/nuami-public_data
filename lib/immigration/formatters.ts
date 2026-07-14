import type { ComparisonResult } from "./types";

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("ko-KR");
}

export function formatSharePercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(2)}%`;
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "-";
  const sign = rate > 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}

export function formatDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "-";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("ko-KR")}`;
}

export function formatComparison(
  comparison: ComparisonResult
): { deltaText: string; rateText: string; direction: "up" | "down" | "neutral" } {
  if (comparison.delta === null || comparison.rate === null) {
    return { deltaText: "-", rateText: "-", direction: "neutral" };
  }

  const direction =
    comparison.delta > 0 ? "up" : comparison.delta < 0 ? "down" : "neutral";

  return {
    deltaText: formatDelta(comparison.delta),
    rateText: formatPercent(comparison.rate),
    direction,
  };
}

export function formatMonthLabel(month: number): string {
  return `${month}월`;
}

export function formatDateKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatYearMonth(dateKey: string): string {
  const [year, month] = dateKey.split("-");
  return `${year}년 ${parseInt(month, 10)}월`;
}
