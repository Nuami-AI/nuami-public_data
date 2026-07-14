import { formatDateKey } from "../immigration/formatters";
import type { PopulationRatioTrendResponse } from "../immigration/types";
import { getPublicApiConfig } from "../immigration/public-api/config";
import { buildSidoRanking } from "../immigration/public-api/ranking";
import {
  getLongTermRegionSourceMessage,
  loadLongTermNationalCount,
  loadLongTermRegionRows,
} from "../immigration/public-api/region-longterm";
import {
  findResidentPopulation,
  getKosisSourceMessage,
  loadResidentPopulationMonthly,
  loadResidentPopulationYearly,
} from "./kosis";

const trendCache = new Map<string, PopulationRatioTrendResponse>();

async function loadMonthlyRatioTrend(
  year: number
): Promise<PopulationRatioTrendResponse> {
  const config = getPublicApiConfig();
  const foreignerRows = await loadLongTermRegionRows(config, {
    minYear: config.minYear,
  });
  const residentRows = await loadResidentPopulationMonthly(year, 1, year, 12);
  const points: PopulationRatioTrendResponse["points"] = [];

  for (let month = 1; month <= 12; month++) {
    const periodKey = formatDateKey(year, month);
    const foreignerRanking = buildSidoRanking(foreignerRows, year, month);
    const foreignerPopulation =
      (await loadLongTermNationalCount(year, month)) ??
      foreignerRanking.reduce((sum, item) => sum + item.count, 0);
    const resident = findResidentPopulation(residentRows, {
      periodKey,
      regionName: "전국",
      level: "national",
    });

    if (!resident || !foreignerPopulation) continue;

    points.push({
      period: periodKey,
      year,
      month,
      residentPopulation: resident.total,
      foreignerPopulation,
      foreignerSharePercent: (foreignerPopulation / resident.total) * 100,
    });
  }

  return {
    periodView: "monthly",
    year,
    points,
    sourceMessage: `${getKosisSourceMessage()} · ${getLongTermRegionSourceMessage(config)}`,
  };
}

async function loadYearlyRatioTrend(
  startYear: number,
  endYear: number
): Promise<PopulationRatioTrendResponse> {
  const config = getPublicApiConfig();
  const foreignerRows = await loadLongTermRegionRows(config, {
    minYear: config.minYear,
  });
  const residentRows = await loadResidentPopulationYearly(startYear, endYear);
  const points: PopulationRatioTrendResponse["points"] = [];

  for (let year = startYear; year <= endYear; year++) {
    const foreignerRanking = buildSidoRanking(foreignerRows, year, 12);
    const foreignerPopulation =
      (await loadLongTermNationalCount(year, 12)) ??
      foreignerRanking.reduce((sum, item) => sum + item.count, 0);
    const resident = findResidentPopulation(residentRows, {
      periodKey: String(year),
      regionName: "전국",
      level: "national",
    });

    if (!resident || !foreignerPopulation) continue;

    points.push({
      period: String(year),
      year,
      residentPopulation: resident.total,
      foreignerPopulation,
      foreignerSharePercent: (foreignerPopulation / resident.total) * 100,
    });
  }

  return {
    periodView: "yearly",
    points,
    sourceMessage: `${getKosisSourceMessage()} · ${getLongTermRegionSourceMessage(config)} (12월 기준)`,
  };
}

export async function loadPopulationRatioTrend(options: {
  view: "monthly" | "yearly";
  year?: number;
  startYear?: number;
  endYear?: number;
}): Promise<PopulationRatioTrendResponse> {
  if (options.view === "monthly") {
    const year = options.year ?? new Date().getFullYear();
    const cacheKey = `monthly-${year}`;
    const cached = trendCache.get(cacheKey);
    if (cached) return cached;

    const result = await loadMonthlyRatioTrend(year);
    trendCache.set(cacheKey, result);
    return result;
  }

  const endYear = options.endYear ?? options.year ?? new Date().getFullYear();
  const startYear = options.startYear ?? endYear - 5;
  const cacheKey = `yearly-${startYear}-${endYear}`;
  const cached = trendCache.get(cacheKey);
  if (cached) return cached;

  const result = await loadYearlyRatioTrend(startYear, endYear);
  trendCache.set(cacheKey, result);
  return result;
}
