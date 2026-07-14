import { parseNumericValue } from "../parser";
import { calculateMoM } from "../calculations";
import type { MonthlyTrendPoint, NationalityDetailItem, RankingItem } from "../types";

export type RawRow = Record<string, unknown>;

const SIDO_ALIASES: Record<string, string> = {
  경기: "경기도",
  강원도: "강원특별자치도",
  전라북도: "전북특별자치도",
};

export function normalizeSidoName(sido: string): string {
  const trimmed = sido.trim();
  return SIDO_ALIASES[trimmed] ?? trimmed;
}

export function pickField(row: RawRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
}

export function parseYearMonth(row: RawRow): { year: number; month: number } | null {
  const year = parseNumericValue(pickField(row, ["년", "Year", "year"]));
  const month = parseNumericValue(pickField(row, ["월", "Month", "month"]));
  if (year === null || month === null || month < 1 || month > 12) return null;
  return { year, month };
}

export function parseCount(row: RawRow): number | null {
  return parseNumericValue(
    pickField(row, [
      "장기체류외국인수",
      "등록거소외국인수",
      "등록·거소외국인수",
      "외국인수",
      "등록외국인수",
      "국내거소신고동포수",
      "체류외국인수",
      "체류외국인 수",
      "유학생수",
      "Number of Foreign Students",
      "count",
    ])
  );
}

export function parseRegisteredOnlyCount(row: RawRow): number | null {
  return parseNumericValue(pickField(row, ["등록외국인수", "외국인수", "count"]));
}

export function getPreviousPeriod(
  year: number,
  month: number
): { year: number; month: number } {
  if (month > 1) {
    return { year, month: month - 1 };
  }
  return { year: year - 1, month: 12 };
}

function normalizeVisaCategory(category: string): string {
  return category.toUpperCase().replace(/\s/g, "");
}

export function matchesVisaCategory(category: string, visaCode: string): boolean {
  const normalizedCategory = normalizeVisaCategory(category);
  const normalizedVisa = normalizeVisaCategory(visaCode);

  if (normalizedVisa === "D-2" || normalizedVisa === "D2") {
    return normalizedCategory.includes("D2") || normalizedCategory.includes("D-2");
  }

  if (normalizedVisa === "D-4" || normalizedVisa === "D4") {
    return (
      normalizedCategory.includes("D4") ||
      normalizedCategory.includes("D-4") ||
      normalizedCategory.includes("일반연수")
    );
  }

  return normalizedCategory.includes(normalizedVisa.replace("-", ""));
}

export function buildStudentNationalityRanking(
  rows: RawRow[],
  visaCode: string,
  year: number,
  month: number,
  limit?: number
): RankingItem[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const period = parseYearMonth(row);
    if (!period || period.year !== year || period.month !== month) continue;

    const category = pickField(row, ["구분", "Category", "category"]);
    const name = pickField(row, ["국적지역", "Nationality(Resion)", "nationality"]);
    const count = parseCount(row);

    if (typeof category !== "string" || typeof name !== "string" || count === null) {
      continue;
    }
    if (!matchesVisaCategory(category, visaCode) || isAggregateLabel(name)) continue;

    totals.set(name, (totals.get(name) ?? 0) + count);
  }

  return toRanking(totals, limit);
}

export function isAggregateLabel(name: string): boolean {
  const normalized = name.replace(/\s/g, "");
  return (
    normalized.includes("합계") ||
    normalized.includes("전체") ||
    normalized.includes("총계") ||
    normalized === "기타"
  );
}

export function toRanking(items: Map<string, number>, limit?: number): RankingItem[] {
  const sorted = Array.from(items.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return limit ? sorted.slice(0, limit) : sorted;
}

export function buildNationalityRanking(
  rows: RawRow[],
  year: number,
  month: number,
  limit?: number
): RankingItem[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const period = parseYearMonth(row);
    if (!period || period.year !== year || period.month !== month) continue;

    const name = pickField(row, ["국적지역", "Nationality(Resion)", "nationality"]);
    const count = parseCount(row);

    if (typeof name !== "string" || count === null || isAggregateLabel(name)) continue;
    totals.set(name, (totals.get(name) ?? 0) + count);
  }

  return toRanking(totals, limit);
}

export function buildSidoRanking(
  rows: RawRow[],
  year: number,
  month: number,
  limit?: number
): RankingItem[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const period = parseYearMonth(row);
    if (!period || period.year !== year || period.month !== month) continue;

    const sidoRaw = pickField(row, ["시도", "Resion", "region"]);
    const count = parseCount(row);

    if (typeof sidoRaw !== "string" || count === null || isAggregateLabel(sidoRaw)) continue;
    const sido = normalizeSidoName(sidoRaw);
    totals.set(sido, (totals.get(sido) ?? 0) + count);
  }

  return toRanking(totals, limit);
}

export type SigunguRankingItem = RankingItem & {
  sido: string;
};

export function buildSigunguRanking(
  rows: RawRow[],
  year: number,
  month: number,
  options?: { sido?: string; limit?: number }
): SigunguRankingItem[] {
  const totals = new Map<string, SigunguRankingItem>();

  for (const row of rows) {
    const period = parseYearMonth(row);
    if (!period || period.year !== year || period.month !== month) continue;

    const sidoRaw = pickField(row, ["시도", "Resion", "region"]);
    const sigungu = pickField(row, ["시군구", "district"]);
    const count = parseCount(row);

    if (typeof sidoRaw !== "string" || typeof sigungu !== "string" || count === null) {
      continue;
    }
    const sido = normalizeSidoName(sidoRaw);
    if (isAggregateLabel(sido) || isAggregateLabel(sigungu)) continue;
    if (options?.sido && sido !== normalizeSidoName(options.sido)) continue;

    const key = `${sido}|${sigungu}`;
    const existing = totals.get(key);
    if (existing) {
      existing.count += count;
    } else {
      totals.set(key, { name: sigungu, sido, count });
    }
  }

  const sorted = Array.from(totals.values()).sort((a, b) => b.count - a.count);
  return options?.limit ? sorted.slice(0, options.limit) : sorted;
}

export function getAvailablePeriods(rows: RawRow[]): Array<{ year: number; month: number }> {
  const periods = new Set<string>();

  for (const row of rows) {
    const period = parseYearMonth(row);
    if (!period) continue;
    periods.add(`${period.year}-${period.month}`);
  }

  return Array.from(periods)
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month };
    })
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
}

export function buildNationalityTrend(
  rows: RawRow[],
  countries: string[],
  year: number
): MonthlyTrendPoint[] {
  const byMonth = new Map<number, Record<string, number>>();

  for (const row of rows) {
    const period = parseYearMonth(row);
    if (!period || period.year !== year) continue;

    const name = pickField(row, ["국적지역", "Nationality(Resion)", "nationality"]);
    const count = parseCount(row);

    if (typeof name !== "string" || count === null || !countries.includes(name)) continue;

    const bucket = byMonth.get(period.month) ?? {};
    bucket[name] = (bucket[name] ?? 0) + count;
    byMonth.set(period.month, bucket);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, values]) => ({
      month,
      label: `${month}월`,
      ...values,
    }));
}

export function buildNationalityRankingWithMom(
  rows: RawRow[],
  year: number,
  month: number,
  options?: {
    limit?: number;
    visaCode?: string;
    useStudentRows?: boolean;
  }
): NationalityDetailItem[] {
  const prev = getPreviousPeriod(year, month);
  const currentRanking = options?.useStudentRows
    ? buildStudentNationalityRanking(rows, options.visaCode ?? "", year, month)
    : buildNationalityRanking(rows, year, month);
  const prevRanking = options?.useStudentRows
    ? buildStudentNationalityRanking(rows, options.visaCode ?? "", prev.year, prev.month)
    : buildNationalityRanking(rows, prev.year, prev.month);

  const prevMap = new Map(prevRanking.map((item) => [item.name, item.count]));
  const limited = options?.limit
    ? currentRanking.slice(0, options.limit)
    : currentRanking;

  return limited.map((item) => ({
    ...item,
    mom: calculateMoM(item.count, prevMap.get(item.name)),
    topRegions: [],
  }));
}

export function buildNationalityTopRegions(
  rows: RawRow[],
  nationality: string,
  year: number,
  month: number,
  limit = 5
): RankingItem[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const period = parseYearMonth(row);
    const rowYear = period?.year ?? parseNumericValue(pickField(row, ["년", "Year", "year"]));
    const rowMonth = period?.month;

    if (rowYear !== year) continue;
    if (rowMonth !== null && rowMonth !== undefined && rowMonth !== month) continue;

    const name = pickField(row, ["국적지역", "국적", "Nationality(Resion)", "nationality"]);
    const sido = pickField(row, ["시도", "Resion", "region"]);
    const sigungu = pickField(row, ["시군구", "district"]);
    const count = parseCount(row);

    if (typeof name !== "string" || count === null || name !== nationality) continue;

    let regionLabel = "";
    if (typeof sido === "string" && typeof sigungu === "string") {
      regionLabel = `${sido} ${sigungu}`;
    } else if (typeof sido === "string") {
      regionLabel = sido;
    } else if (typeof sigungu === "string") {
      regionLabel = sigungu;
    }

    if (!regionLabel || isAggregateLabel(regionLabel)) continue;
    totals.set(regionLabel, (totals.get(regionLabel) ?? 0) + count);
  }

  return toRanking(totals, limit);
}

export function attachNationalityTopRegions(
  items: NationalityDetailItem[],
  regionRows: RawRow[],
  year: number,
  month: number,
  regionLimit = 5
): NationalityDetailItem[] {
  if (!regionRows.length) return items;

  return items.map((item) => ({
    ...item,
    topRegions: buildNationalityTopRegions(
      regionRows,
      item.name,
      year,
      month,
      regionLimit
    ),
  }));
}
