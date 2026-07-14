import { formatDateKey } from "../formatters";
import type { DomesticImmigrationResponse } from "../types";
import { getPublicApiConfig } from "./config";
import { PublicApiError } from "./client";
import {
  buildSigunguRanking,
  buildSidoRanking,
  getAvailablePeriods,
} from "./ranking";
import {
  getLongTermRegionMetricLabel,
  getLongTermRegionMetricNote,
  getLongTermRegionSourceMessage,
  loadLongTermNationalCount,
  loadLongTermRegionRows,
  resolveLongTermRegionMode,
  sumRegionalCountsForPeriod,
} from "./region-longterm";

export async function loadDomesticImmigrationData(
  year: number,
  month: number,
  options?: { sido?: string; level?: "sido" | "sigungu" }
): Promise<DomesticImmigrationResponse> {
  const config = getPublicApiConfig();

  if (!config.regionPath && !config.longTermRegionPath) {
    throw new PublicApiError(
      "지역 데이터 API가 설정되지 않았습니다. ODCLOUD_REGION_UDDI(15100022)를 설정하세요."
    );
  }

  const rows = await loadLongTermRegionRows(config, { minYear: config.minYear });
  const sidoRanking = buildSidoRanking(rows, year, month);
  const sigunguRanking = buildSigunguRanking(rows, year, month, {
    sido: options?.sido,
    limit: options?.level === "sigungu" ? undefined : 20,
  });

  if (sidoRanking.length === 0) {
    throw new PublicApiError(`${year}년 ${month}월 지역별 데이터를 찾지 못했습니다.`);
  }

  const nationalLongTerm = await loadLongTermNationalCount(year, month);
  const regionalSum = sumRegionalCountsForPeriod(rows, year, month);
  const totalCount = nationalLongTerm ?? regionalSum;

  const periods = getAvailablePeriods(rows);
  const availableYears = Array.from(new Set(periods.map((p) => p.year))).sort();
  const availableSido = sidoRanking.map((item) => item.name);
  const metricScope = resolveLongTermRegionMode(config) === "registered" ? "registered" : "longTerm";

  return {
    year,
    month,
    dateKey: formatDateKey(year, month),
    totalCount,
    sidoRanking,
    sigunguRanking,
    availableYears,
    availableSido,
    selectedSido: options?.sido ?? null,
    metricScope,
    metricLabel: getLongTermRegionMetricLabel(config),
    metricNote: getLongTermRegionMetricNote(config) ?? undefined,
    sourceMessage: getLongTermRegionSourceMessage(config),
  };
}
