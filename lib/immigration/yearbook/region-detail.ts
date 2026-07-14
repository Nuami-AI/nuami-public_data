import { formatDateKey } from "../formatters";
import type {
  AgeGenderBand,
  RankingItemWithShare,
  RegionDetailResponse,
} from "../types";
import { getAgeGenderForRegion, loadYearbookAgeRegion } from "./age-region";
import { searchRegionsByQuery } from "./region-search";
import { getPublicApiConfig } from "../public-api/config";
import {
  buildSigunguRanking,
  buildSidoRanking,
  parseCount,
  type RawRow,
} from "../public-api/ranking";
import {
  getLongTermRegionSourceMessage,
  loadLongTermNationalCount,
  loadLongTermRegionRows,
} from "../public-api/region-longterm";
import {
  findResidentPopulation,
  getKosisSourceMessage,
  loadResidentPopulationMonthly,
  loadResidentPopulationYearly,
} from "../../population/kosis";

function withShare(items: { name: string; count: number }[], total: number): RankingItemWithShare[] {
  return items.map((item) => ({
    ...item,
    sharePercent: total > 0 ? (item.count / total) * 100 : null,
  }));
}

function buildYearlyForeignerTrend(
  rows: RawRow[],
  sido: string,
  sigungu: string
): Array<{ year: number; count: number }> {
  const byYear = new Map<number, number>();

  for (const row of rows) {
    const year = Number(row["년"] ?? row["Year"] ?? 0);
    const month = Number(row["월"] ?? row["Month"] ?? 0);
    const rowSido = String(row["시도"] ?? "");
    const rowSigungu = String(row["시군구"] ?? "");
    const count = parseCount(row) ?? 0;

    if (!year || month !== 12 || rowSido !== sido || rowSigungu !== sigungu || !count) {
      continue;
    }
    byYear.set(year, (byYear.get(year) ?? 0) + count);
  }

  return Array.from(byYear.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

function toAgeGenderBands(
  rows: ReturnType<typeof getAgeGenderForRegion>
): AgeGenderBand[] {
  return rows.map((row) => ({
    ageBand: row.ageBand,
    male: row.male,
    female: row.female,
    total: row.total,
  }));
}

export async function loadRegionDetail(
  query: string,
  year: number,
  month: number
): Promise<RegionDetailResponse> {
  const search = searchRegionsByQuery(query, { limit: 1 });
  const region = search.result ?? search.matches[0];

  if (!region) {
    return {
      query,
      label: "",
      sido: "",
      sigungu: "",
      year,
      month,
      dateKey: formatDateKey(year, month),
      foreignerCount: 0,
      nationalForeignerCount: 0,
      nationalSharePercent: null,
      sidoRanking: [],
      sigunguRanking: [],
      nationalityRanking: [],
      visaRanking: [],
      ageGenderBands: [],
      yearlyForeignerTrend: [],
      populationRatio: null,
      populationRatioTrend: [],
      yearbookDataYear: search.dataYear,
      sourceMessage: search.sourceMessage,
      error: search.error ?? `"${query}" 지역을 찾지 못했습니다.`,
    };
  }

  let nationalForeignerCount = 0;
  let foreignerCount = region.totalCount;
  let sidoRanking: RankingItemWithShare[] = [];
  let sigunguRanking: RankingItemWithShare[] = [];
  let yearlyForeignerTrend: Array<{ year: number; count: number }> = [];
  let apiSource = "";
  let configRegionPath = "";

  try {
    const config = getPublicApiConfig();
    configRegionPath = config.regionPath || config.longTermRegionPath;
    if (configRegionPath || config.longTermRegionPath) {
      const rows = await loadLongTermRegionRows(config, { minYear: config.minYear });

      const sidoItems = buildSidoRanking(rows, year, month);
      nationalForeignerCount =
        (await loadLongTermNationalCount(year, month)) ??
        sidoItems.reduce((sum, item) => sum + item.count, 0);
      sidoRanking = withShare(sidoItems, nationalForeignerCount);

      const sigunguItems = buildSigunguRanking(rows, year, month, { limit: 15 });
      sigunguRanking = withShare(sigunguItems, nationalForeignerCount);

      const current = sigunguItems.find(
        (item) => item.sido === region.sido && item.name === region.sigungu
      );
      if (current) foreignerCount = current.count;

      yearlyForeignerTrend = buildYearlyForeignerTrend(rows, region.sido, region.sigungu);
      apiSource = getLongTermRegionSourceMessage(config);
    }
  } catch {
    nationalForeignerCount = searchRegionsByQuery("", { limit: 300 }).matches.reduce(
      (sum, item) => sum + item.totalCount,
      0
    );
  }

  const nationalityRanking = withShare(region.nationalityRanking, foreignerCount);
  const visaRanking = withShare(region.visaRanking, foreignerCount);

  const ageData = loadYearbookAgeRegion(year);
  const ageGenderBands = ageData
    ? toAgeGenderBands(getAgeGenderForRegion(ageData.rows, region.sido, region.sigungu))
    : [];

  const periodKey = formatDateKey(year, month);
  const residentMonthly = await loadResidentPopulationMonthly(year, month, year, month);
  const residentYearly = await loadResidentPopulationYearly(year - 5, year);

  const nationalResident =
    findResidentPopulation(residentMonthly, { periodKey, regionName: "전국", level: "national" }) ??
    findResidentPopulation(residentYearly, { periodKey: String(year), regionName: "전국", level: "national" });

  const sidoResident = findResidentPopulation(residentMonthly, {
    periodKey,
    regionName: region.sido,
    level: "sido",
  });

  const sigunguResident = findResidentPopulation(residentMonthly, {
    periodKey,
    regionName: region.sigungu,
    sidoName: region.sido,
    level: "sigungu",
  });

  const residentPopulation =
    sigunguResident?.total ?? sidoResident?.total ?? nationalResident?.total ?? null;

  const populationRatio =
    residentPopulation && residentPopulation > 0
      ? {
          residentPopulation,
          foreignerPopulation: foreignerCount,
          foreignerSharePercent: (foreignerCount / residentPopulation) * 100,
          period: periodKey,
          scope: sigunguResident ? ("sigungu" as const) : sidoResident ? ("sido" as const) : ("national" as const),
          sourceMessage: getKosisSourceMessage(),
        }
      : null;

  const populationRatioTrend: RegionDetailResponse["populationRatioTrend"] = [];

  if (configRegionPath) {
    try {
      const config = getPublicApiConfig();
      const rows = await loadLongTermRegionRows(config, { minYear: config.minYear });

      for (let m = 1; m <= 12; m++) {
        const monthlyKey = formatDateKey(year, m);
        const sigunguItems = buildSigunguRanking(rows, year, m);
        const current = sigunguItems.find(
          (item) => item.sido === region.sido && item.name === region.sigungu
        );
        const residentPoint = findResidentPopulation(residentMonthly, {
          periodKey: monthlyKey,
          regionName: sigunguResident ? region.sigungu : region.sido,
          sidoName: sigunguResident ? region.sido : undefined,
          level: sigunguResident ? "sigungu" : "sido",
        });
        if (!current || !residentPoint) continue;

        populationRatioTrend.push({
          period: monthlyKey,
          year,
          month: m,
          residentPopulation: residentPoint.total,
          foreignerPopulation: current.count,
          foreignerSharePercent: (current.count / residentPoint.total) * 100,
        });
      }
    } catch {
      // ignore trend errors
    }
  }

  const nationalSharePercent =
    nationalForeignerCount > 0 ? (foreignerCount / nationalForeignerCount) * 100 : null;

  const sourceParts = [
    apiSource,
    search.sourceMessage,
    ageData?.sourceMessage,
    getKosisSourceMessage(),
  ].filter(Boolean);

  return {
    query,
    label: region.label,
    sido: region.sido,
    sigungu: region.sigungu,
    year,
    month,
    dateKey: periodKey,
    foreignerCount,
    nationalForeignerCount,
    nationalSharePercent,
    sidoRanking,
    sigunguRanking,
    nationalityRanking,
    visaRanking,
    ageGenderBands,
    yearlyForeignerTrend,
    populationRatio,
    populationRatioTrend,
    studentContext: region.studentContext,
    yearbookDataYear: search.dataYear,
    sourceMessage: sourceParts.join(" · "),
  };
}
