import { unstable_cache } from "next/cache";
import { MIN_COLLECTION_YEAR } from "../constants";
import { getPublicApiConfig } from "./config";
import { fetchAllOdcloudRows, PublicApiError } from "./client";
import {
  filterStatsFromYear,
  mergeVisaRows,
  mergeYearlyAndMonthly,
  transformMonthlyRows,
  transformYearlyRows,
} from "./transform";
import type { ImmigrationMonthlyStat } from "../types";

export type PublicApiLoadResult = {
  stats: ImmigrationMonthlyStat[];
  source: "api";
  message: string;
  meta: {
    minYear: number;
    monthlyRows: number;
    yearlyRows: number;
    visaRows: number;
    visaYearlyRows: number;
    periods: number;
  };
};

async function loadFromPublicApiInternal(): Promise<PublicApiLoadResult> {
  const config = getPublicApiConfig();
  const fetchOptions = { minYear: config.minYear };

  const [monthlyRaw, yearlyRaw, visaRaw, visaYearlyRaw] = await Promise.all([
    fetchAllOdcloudRows(config, config.monthlyPath, 1000, fetchOptions),
    fetchAllOdcloudRows(config, config.yearlyPath, 1000, fetchOptions),
    fetchAllOdcloudRows(config, config.visaPath, 1000, fetchOptions),
    config.visaYearlyPath
      ? fetchAllOdcloudRows(config, config.visaYearlyPath, 1000, fetchOptions)
      : Promise.resolve([]),
  ]);

  const yearlyStats = transformYearlyRows(yearlyRaw);
  const monthlyStats = transformMonthlyRows(monthlyRaw);

  let stats = mergeYearlyAndMonthly(yearlyStats, monthlyStats);
  stats = mergeVisaRows(stats, visaRaw, false);

  if (visaYearlyRaw.length > 0) {
    stats = mergeVisaRows(stats, visaYearlyRaw, true);
  }

  stats = filterStatsFromYear(stats, config.minYear);

  if (stats.length === 0) {
    throw new PublicApiError(
      `${config.minYear}년 이후 공공데이터를 찾지 못했습니다. API Endpoint와 활용신청을 확인하세요.`
    );
  }

  const earliest = stats[0];
  if (earliest.year > config.minYear) {
    console.warn(
      `[public-api] 수집 시작 연도(${config.minYear})보다 늦은 ${earliest.year}년부터 데이터가 있습니다.`
    );
  }

  return {
    stats,
    source: "api",
    message: `공공데이터포털 API (${config.minYear}년~, ${stats.length}개월)`,
    meta: {
      minYear: config.minYear,
      monthlyRows: monthlyRaw.length,
      yearlyRows: yearlyRaw.length,
      visaRows: visaRaw.length,
      visaYearlyRows: visaYearlyRaw.length,
      periods: stats.length,
    },
  };
}

const CACHE_SECONDS =
  process.env.NODE_ENV === "development"
    ? 0
    : Number(process.env.ODCLOUD_CACHE_SECONDS ?? 3600);

const getCachedPublicApiData =
  CACHE_SECONDS > 0
    ? unstable_cache(loadFromPublicApiInternal, ["immigration-public-api"], {
        revalidate: CACHE_SECONDS,
        tags: ["immigration"],
      })
    : null;

export async function loadFromPublicApi(): Promise<PublicApiLoadResult> {
  try {
    if (!getCachedPublicApiData) {
      return await loadFromPublicApiInternal();
    }
    return await getCachedPublicApiData();
  } catch (error) {
    if (error instanceof PublicApiError) throw error;
    if (error instanceof Error && error.message.includes("환경변수")) {
      throw new PublicApiError(error.message);
    }
    throw new PublicApiError("공공데이터 API 호출 중 오류가 발생했습니다");
  }
}

export { getPublicApiConfig } from "./config";
export { PublicApiError } from "./client";
export { loadVisaDetail, loadVisaBreakdownForPeriod } from "./detail";
export { loadGlobalImmigrationData } from "./global";
export { loadDomesticImmigrationData } from "./domestic";
export { MIN_COLLECTION_YEAR };
