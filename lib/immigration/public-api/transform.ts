import { formatDateKey } from "../formatters";
import { isWithinCollectionRange } from "../constants";
import { parseNumericValue } from "../parser";
import { matchFocusVisaField } from "../visa";
import {
  ImmigrationMonthlyStatSchema,
  type ImmigrationMonthlyStat,
} from "../types";

type RawRow = Record<string, unknown>;

function pickField(row: RawRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
}

function parseYear(row: RawRow): number | null {
  const yearRaw = pickField(row, ["년", "Year", "year", "기준연도"]);
  const year = parseNumericValue(yearRaw);
  return year;
}

function parseYearMonth(row: RawRow): { year: number; month: number } | null {
  const year = parseYear(row);
  const monthRaw = pickField(row, ["월", "Month", "month", "기준월"]);
  const month = parseNumericValue(monthRaw);

  if (year === null || month === null || month < 1 || month > 12) {
    return null;
  }

  if (!isWithinCollectionRange(year)) return null;

  return { year, month };
}

function parseCount(row: RawRow): number | null {
  const value = pickField(row, [
    "체류외국인수",
    "체류외국인 수",
    "인원",
    "count",
    "value",
  ]);
  return parseNumericValue(value);
}

type MonthlyMetricField =
  | "totalForeigners"
  | "shortTermForeigners"
  | "longTermForeigners"
  | "registeredForeigners"
  | "residenceReporters";

/** 공공데이터 실제 구분값 — 구체적 매칭 우선 (장기체류등록/거소 > 장기 > 단기) */
const CATEGORY_RULES: Array<{ patterns: string[]; field: MonthlyMetricField }> = [
  { patterns: ["장기체류등록", "등록외국인", "등록"], field: "registeredForeigners" },
  { patterns: ["장기체류거소", "거소신고", "거소"], field: "residenceReporters" },
  { patterns: ["단기체류", "단기"], field: "shortTermForeigners" },
  { patterns: ["장기체류", "장기"], field: "longTermForeigners" },
  { patterns: ["전체", "합계", "총계", "체류외국인"], field: "totalForeigners" },
];

function matchCategory(category: string): MonthlyMetricField | null {
  const normalized = category.replace(/\s/g, "");

  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      const p = pattern.replace(/\s/g, "");
      if (normalized === p || normalized.includes(p)) {
        return rule.field;
      }
    }
  }
  return null;
}

function createEmptyStat(year: number, month: number): ImmigrationMonthlyStat {
  return {
    year,
    month,
    dateKey: formatDateKey(year, month),
    totalForeigners: 0,
    shortTermForeigners: 0,
    longTermForeigners: 0,
    registeredForeigners: 0,
    residenceReporters: 0,
    d2Students: 0,
    d4Trainees: 0,
  };
}

function finalizeStat(stat: ImmigrationMonthlyStat): ImmigrationMonthlyStat | null {
  // 등록 + 거소 → 장기체류 (공공데이터는 장기체류등록/거소로 분리 제공)
  if (stat.registeredForeigners > 0 && stat.residenceReporters > 0) {
    stat.longTermForeigners =
      stat.registeredForeigners + stat.residenceReporters;
  }

  // 단기 + 장기 → 전체 체류외국인
  if (stat.shortTermForeigners > 0 && stat.longTermForeigners > 0) {
    stat.totalForeigners = stat.shortTermForeigners + stat.longTermForeigners;
  }

  const validated = ImmigrationMonthlyStatSchema.safeParse(stat);
  if (!validated.success) return null;

  const hasCoreData =
    validated.data.totalForeigners > 0 ||
    validated.data.shortTermForeigners > 0 ||
    validated.data.longTermForeigners > 0;

  return hasCoreData ? validated.data : null;
}

function sortStats(stats: ImmigrationMonthlyStat[]): ImmigrationMonthlyStat[] {
  return [...stats].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

export function filterStatsFromYear(
  stats: ImmigrationMonthlyStat[],
  minYear: number
): ImmigrationMonthlyStat[] {
  return stats.filter((s) => s.year >= minYear);
}

export function transformMonthlyRows(rows: RawRow[]): ImmigrationMonthlyStat[] {
  const byDate = new Map<string, ImmigrationMonthlyStat>();

  for (const row of rows) {
    const period = parseYearMonth(row);
    const count = parseCount(row);
    const categoryRaw = pickField(row, ["구분", "Category", "category"]);

    if (!period || count === null || typeof categoryRaw !== "string") continue;

    const field = matchCategory(categoryRaw);
    if (!field) continue;

    const dateKey = formatDateKey(period.year, period.month);
    const stat = byDate.get(dateKey) ?? createEmptyStat(period.year, period.month);
    stat[field] = count;
    byDate.set(dateKey, stat);
  }

  return sortStats(
    Array.from(byDate.values())
      .map(finalizeStat)
      .filter((s): s is ImmigrationMonthlyStat => s !== null)
  );
}

/** 연도별 데이터 → 12월(연말) 기준 월별 스냅샷으로 변환 */
export function transformYearlyRows(rows: RawRow[]): ImmigrationMonthlyStat[] {
  const byDate = new Map<string, ImmigrationMonthlyStat>();

  for (const row of rows) {
    const year = parseYear(row);
    const count = parseCount(row);
    const categoryRaw = pickField(row, ["구분", "Category", "category"]);

    if (year === null || !isWithinCollectionRange(year) || count === null) continue;
    if (typeof categoryRaw !== "string") continue;

    const field = matchCategory(categoryRaw);
    if (!field) continue;

    const dateKey = formatDateKey(year, 12);
    const stat = byDate.get(dateKey) ?? createEmptyStat(year, 12);
    stat[field] = count;
    byDate.set(dateKey, stat);
  }

  return sortStats(
    Array.from(byDate.values())
      .map(finalizeStat)
      .filter((s): s is ImmigrationMonthlyStat => s !== null)
  );
}

export function mergeVisaRows(
  stats: ImmigrationMonthlyStat[],
  visaRows: RawRow[],
  yearly = false
): ImmigrationMonthlyStat[] {
  const byDate = new Map(stats.map((s) => [s.dateKey, { ...s }]));

  for (const row of visaRows) {
    const year = parseYear(row);
    const count = parseCount(row);
    const statusRaw = pickField(row, [
      "체류자격",
      "Sojourn Status",
      "sojournStatus",
      "visa",
    ]);

    if (year === null || !isWithinCollectionRange(year) || count === null) continue;
    if (typeof statusRaw !== "string") continue;

    const visaField = matchFocusVisaField(statusRaw);
    if (!visaField) continue;

    let month = 12;
    if (!yearly) {
      const period = parseYearMonth(row);
      if (!period) continue;
      month = period.month;
    }

    const dateKey = formatDateKey(year, month);
    const stat = byDate.get(dateKey) ?? createEmptyStat(year, month);
    stat[visaField] = count;
    byDate.set(dateKey, stat);
  }

  return sortStats(
    Array.from(byDate.values())
      .map(finalizeStat)
      .filter((s): s is ImmigrationMonthlyStat => s !== null)
  );
}

/** 연도별(연말) 베이스 + 월별 데이터 오버레이 — 월별이 우선 */
export function mergeYearlyAndMonthly(
  yearlyStats: ImmigrationMonthlyStat[],
  monthlyStats: ImmigrationMonthlyStat[]
): ImmigrationMonthlyStat[] {
  const byDate = new Map<string, ImmigrationMonthlyStat>();

  for (const stat of yearlyStats) {
    byDate.set(stat.dateKey, { ...stat });
  }

  for (const stat of monthlyStats) {
    byDate.set(stat.dateKey, { ...stat });
  }

  return sortStats(
    Array.from(byDate.values())
      .map(finalizeStat)
      .filter((s): s is ImmigrationMonthlyStat => s !== null)
  );
}
