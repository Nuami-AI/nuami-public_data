import { loadFromPublicApi, PublicApiError } from "./public-api";
import type { ImmigrationMonthlyStat } from "./types";

export type DataSource = "api";

export type LoadResult = {
  stats: ImmigrationMonthlyStat[];
  source: DataSource;
  sourceMessage: string;
};

export async function loadImmigrationRawData(): Promise<LoadResult> {
  try {
    const apiResult = await loadFromPublicApi();
    return {
      stats: apiResult.stats,
      source: apiResult.source,
      sourceMessage: apiResult.message,
    };
  } catch (error) {
    const message =
      error instanceof PublicApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "공공데이터 API 호출 실패";

    throw new PublicApiError(message);
  }
}

export async function loadImmigrationData() {
  const { attachComparisons, buildYearlySummaries } = await import("./transform");
  const { stats, source, sourceMessage } = await loadImmigrationRawData();
  const withComparisons = attachComparisons(stats);
  const yearlySummaries = buildYearlySummaries(stats);
  const availableYears = Array.from(new Set(stats.map((s) => s.year))).sort();

  return {
    stats: withComparisons,
    yearlySummaries,
    availableYears,
    source,
    sourceMessage,
    lastUpdated: stats.length > 0 ? stats[stats.length - 1].dateKey : null,
  };
}
