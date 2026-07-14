import { calculateMoM, calculateYoY } from "./calculations";
import type {
  ImmigrationMonthlyStat,
  MetricKey,
  StatWithComparisons,
  YearlySummary,
} from "./types";
import { METRIC_KEYS } from "./types";

function sortStats(stats: ImmigrationMonthlyStat[]): ImmigrationMonthlyStat[] {
  return [...stats].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

function findPrevMonth(
  stats: ImmigrationMonthlyStat[],
  stat: ImmigrationMonthlyStat
): ImmigrationMonthlyStat | undefined {
  const idx = stats.findIndex(
    (s) => s.year === stat.year && s.month === stat.month
  );
  return idx > 0 ? stats[idx - 1] : undefined;
}

function findYoYMonth(
  stats: ImmigrationMonthlyStat[],
  stat: ImmigrationMonthlyStat
): ImmigrationMonthlyStat | undefined {
  return stats.find(
    (s) => s.year === stat.year - 1 && s.month === stat.month
  );
}

export function attachComparisons(
  stats: ImmigrationMonthlyStat[]
): StatWithComparisons[] {
  const sorted = sortStats(stats);

  return sorted.map((stat) => {
    const prev = findPrevMonth(sorted, stat);
    const yoy = findYoYMonth(sorted, stat);

    const mom = {} as StatWithComparisons["mom"];
    const yoyComp = {} as StatWithComparisons["yoy"];

    for (const key of METRIC_KEYS) {
      mom[key] = calculateMoM(stat[key], prev?.[key]);
      yoyComp[key] = calculateYoY(stat[key], yoy?.[key]);
    }

    return { ...stat, mom, yoy: yoyComp };
  });
}

export function buildYearlySummaries(
  stats: ImmigrationMonthlyStat[]
): YearlySummary[] {
  const byYear = new Map<number, ImmigrationMonthlyStat[]>();

  for (const stat of stats) {
    const list = byYear.get(stat.year) ?? [];
    list.push(stat);
    byYear.set(stat.year, list);
  }

  return Array.from(byYear.entries())
    .map(([year, yearStats]) => {
      const sorted = sortStats(yearStats);
      const last = sorted[sorted.length - 1];

      return {
        year,
        totalForeigners: last.totalForeigners,
        shortTermForeigners: last.shortTermForeigners,
        longTermForeigners: last.longTermForeigners,
        registeredForeigners: last.registeredForeigners,
        residenceReporters: last.residenceReporters,
        d2Students: last.d2Students,
        d4Trainees: last.d4Trainees,
        monthsCount: sorted.length,
      };
    })
    .sort((a, b) => a.year - b.year);
}

export function filterByYearMonth(
  stats: StatWithComparisons[],
  year: number | "all",
  month: number | "all"
): StatWithComparisons[] {
  return stats.filter((s) => {
    if (year !== "all" && s.year !== year) return false;
    if (month !== "all" && s.month !== month) return false;
    return true;
  });
}

export function getStatForPeriod(
  stats: StatWithComparisons[],
  year: number,
  month: number
): StatWithComparisons | undefined {
  return stats.find((s) => s.year === year && s.month === month);
}

export function getChartDataForYear(
  stats: StatWithComparisons[],
  year: number
): StatWithComparisons[] {
  return stats.filter((s) => s.year === year).sort((a, b) => a.month - b.month);
}

export type { MetricKey };
