import type { GlobalImmigrationResponse } from "../types";
import { loadUnMigrantStock } from "../un/world-bank";

export async function loadGlobalImmigrationData(
  year: number
): Promise<GlobalImmigrationResponse> {
  const data = await loadUnMigrantStock(year);

  return {
    year: data.year,
    totalCount: data.totalCount,
    ranking: data.ranking,
    topCountries: data.topCountries,
    yearlyTrend: data.yearlyTrend,
    availableYears: data.availableYears,
    source: "un_desa_world_bank",
    sourceMessage: data.sourceMessage,
  };
}
